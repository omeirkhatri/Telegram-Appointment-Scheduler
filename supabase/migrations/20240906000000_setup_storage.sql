-- Set up Supabase Storage for patient ID document uploads
-- This migration creates the storage bucket and configures security policies

-- Create storage bucket for patient ID documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'patient-documents',
    'patient-documents',
    false, -- Private bucket for security
    10485760, -- 10MB file size limit
    ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf',
        'image/webp'
    ]
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy for authenticated users to upload patient documents
CREATE POLICY "Allow authenticated users to upload patient documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'patient-documents' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = 'id-documents'
    );

-- Create storage policy for authenticated users to view patient documents
CREATE POLICY "Allow authenticated users to view patient documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'patient-documents' AND
        auth.role() = 'authenticated'
    );

-- Create storage policy for authenticated users to update patient documents
CREATE POLICY "Allow authenticated users to update patient documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'patient-documents' AND
        auth.role() = 'authenticated'
    );

-- Create storage policy for authenticated users to delete patient documents
CREATE POLICY "Allow authenticated users to delete patient documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'patient-documents' AND
        auth.role() = 'authenticated'
    );

-- Create function to generate secure file paths for patient documents
CREATE OR REPLACE FUNCTION generate_patient_document_path(
    patient_id UUID,
    filename TEXT
)
RETURNS TEXT AS $$
DECLARE
    file_extension TEXT;
    secure_filename TEXT;
    file_path TEXT;
BEGIN
    -- Extract file extension
    file_extension := LOWER(SUBSTRING(filename FROM '\.([^.]*)$'));

    -- Generate secure filename with timestamp and UUID
    secure_filename := patient_id::TEXT || '_' ||
                      EXTRACT(EPOCH FROM NOW())::TEXT || '_' ||
                      gen_random_uuid()::TEXT || '.' || file_extension;

    -- Create file path in the id-documents folder
    file_path := 'id-documents/' || secure_filename;

    RETURN file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate patient document uploads
CREATE OR REPLACE FUNCTION validate_patient_document_upload(
    bucket_id TEXT,
    file_path TEXT,
    file_size BIGINT,
    mime_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if bucket is correct
    IF bucket_id != 'patient-documents' THEN
        RETURN false;
    END IF;

    -- Check if file is in the correct folder
    IF NOT (file_path LIKE 'id-documents/%') THEN
        RETURN false;
    END IF;

    -- Check file size (10MB limit)
    IF file_size > 10485760 THEN
        RETURN false;
    END IF;

    -- Check mime type
    IF mime_type NOT IN (
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf',
        'image/webp'
    ) THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to automatically update patient record when document is uploaded
CREATE OR REPLACE FUNCTION update_patient_document_url()
RETURNS TRIGGER AS $$
DECLARE
    patient_uuid UUID;
    file_path_parts TEXT[];
BEGIN
    -- Only process uploads to patient-documents bucket
    IF NEW.bucket_id != 'patient-documents' THEN
        RETURN NEW;
    END IF;

    -- Extract patient ID from filename (format: patient_id_timestamp_uuid.extension)
    file_path_parts := string_to_array(NEW.name, '/');
    IF array_length(file_path_parts, 1) >= 2 THEN
        -- Extract patient ID from the filename part
        patient_uuid := (string_to_array(file_path_parts[2], '_'))[1]::UUID;

        -- Update patient record with document URL
        UPDATE patients
        SET
            id_document_url = NEW.id,
            id_document_filename = file_path_parts[2],
            updated_at = NOW()
        WHERE id = patient_uuid;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update patient document URL
CREATE TRIGGER update_patient_document_url_trigger
    AFTER INSERT ON storage.objects
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_document_url();

-- Create function to clean up orphaned documents when patient is deleted
CREATE OR REPLACE FUNCTION cleanup_patient_documents()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete all documents associated with the deleted patient
    DELETE FROM storage.objects
    WHERE bucket_id = 'patient-documents'
    AND name LIKE 'id-documents/' || OLD.id::TEXT || '_%';

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to clean up documents when patient is deleted
CREATE TRIGGER cleanup_patient_documents_trigger
    BEFORE DELETE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_patient_documents();

-- Add comment to document the storage setup
COMMENT ON SCHEMA storage IS 'Supabase Storage schema for file management';
COMMENT ON TABLE storage.buckets IS 'Storage buckets configuration';
COMMENT ON TABLE storage.objects IS 'Storage objects (files) with metadata';
COMMENT ON FUNCTION generate_patient_document_path(UUID, TEXT) IS 'Generates secure file paths for patient ID documents';
COMMENT ON FUNCTION validate_patient_document_upload(TEXT, TEXT, BIGINT, TEXT) IS 'Validates patient document uploads for security and format';
