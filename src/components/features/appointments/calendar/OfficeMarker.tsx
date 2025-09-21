// @ts-nocheck
'use client';

import { useOfficeSettings } from '@/hooks/useOfficeSettings';
import React, { useEffect, useRef, useState } from 'react';

interface OfficeMarkerProps {
  map: google.maps.Map | null;
  isVisible?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function OfficeMarker({
  map,
  isVisible = true,
  onClick,
  className = '',
  style = {}
}: OfficeMarkerProps) {
  const { officeSettings, isLoading } = useOfficeSettings();
  const markerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);

  // Create marker only once when map and office settings are available
  useEffect(() => {
    if (!map || !officeSettings || isLoading || markerRef.current) return;

    // Create custom marker icon
    const officeIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="${officeSettings.color}" stroke="white" stroke-width="3"/>
          <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${officeSettings.icon}</text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20)
    };

    // Create marker
    const marker = new google.maps.Marker({
      position: officeSettings.coordinates,
      map: map,
      title: officeSettings.name,
      icon: officeIcon,
      zIndex: 1000 // Higher z-index to appear above appointment markers
    });

    // Create info window content
    const infoWindowContent = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 280px;
        padding: 0;
      ">
        <!-- Header -->
        <div style="
          background: ${officeSettings.color};
          color: white;
          padding: 8px;
          border-radius: 6px 6px 0 0;
          text-align: center;
        ">
          <div style="font-size: 16px; margin-bottom: 2px;">${officeSettings.icon}</div>
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 1px;">${officeSettings.name}</div>
          <div style="font-size: 9px; opacity: 0.9;">Our Office Location</div>
        </div>

        <!-- Content -->
        <div style="padding: 8px; background: white; border-radius: 0 0 6px 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Address -->
          <div style="margin-bottom: 6px;">
            <div style="
              display: flex;
              align-items: flex-start;
              gap: 4px;
              margin-bottom: 2px;
            ">
              <div style="
                width: 14px;
                height: 14px;
                background: #f3f4f6;
                border-radius: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9px;
                flex-shrink: 0;
                margin-top: 1px;
              ">📍</div>
              <span style="font-size: 10px; color: #6b7280; font-weight: 500;">Address</span>
            </div>
            <div style="font-size: 11px; color: #111827; margin-left: 18px; line-height: 1.2;">
              ${officeSettings.address}
            </div>
          </div>

          ${officeSettings.phone ? `
            <!-- Phone -->
            <div style="margin-bottom: 6px;">
              <div style="
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 2px;
              ">
                <div style="
                  width: 14px;
                  height: 14px;
                  background: #f3f4f6;
                  border-radius: 2px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 9px;
                ">📞</div>
                <span style="font-size: 10px; color: #6b7280; font-weight: 500;">Phone</span>
              </div>
              <div style="font-size: 11px; color: #111827; margin-left: 18px;">
                <a href="tel:${officeSettings.phone}" style="color: ${officeSettings.color}; text-decoration: none;">
                  ${officeSettings.phone}
                </a>
              </div>
            </div>
          ` : ''}

          ${officeSettings.email ? `
            <!-- Email -->
            <div style="margin-bottom: 6px;">
              <div style="
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 2px;
              ">
                <div style="
                  width: 14px;
                  height: 14px;
                  background: #f3f4f6;
                  border-radius: 2px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 9px;
                ">✉️</div>
                <span style="font-size: 10px; color: #6b7280; font-weight: 500;">Email</span>
              </div>
              <div style="font-size: 11px; color: #111827; margin-left: 18px;">
                <a href="mailto:${officeSettings.email}" style="color: ${officeSettings.color}; text-decoration: none;">
                  ${officeSettings.email}
                </a>
              </div>
            </div>
          ` : ''}

          <!-- Footer -->
          <div style="
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 9px;
            color: #6b7280;
          ">
            Click to close
          </div>
        </div>
      </div>
    `;

    // Create info window
    const infoWindow = new google.maps.InfoWindow({
      content: infoWindowContent,
      maxWidth: 280,
      pixelOffset: new google.maps.Size(0, -10)
    });

    // Add custom CSS for office popup close button
    const officeStyle = document.createElement('style');
    officeStyle.id = 'office-info-window-close-button-style';
    officeStyle.textContent = `
      .gm-ui-hover-effect {
        padding: 1px !important;
        margin: 0 !important;
        width: 16px !important;
        height: 16px !important;
        top: 2px !important;
        right: 2px !important;
        background: #1f2937 !important;
        border-radius: 50% !important;
        border: 1px solid #000000 !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
        position: absolute !important;
        z-index: 1001 !important;
      }
      .gm-ui-hover-effect img {
        width: 12px !important;
        height: 12px !important;
        filter: invert(1) brightness(2) !important;
      }
      .gm-ui-hover-effect:hover {
        background: #374151 !important;
      }
    `;
    document.head.appendChild(officeStyle);

    // Add click listener
    marker.addListener('click', () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      infoWindow.open(map, marker);
      infoWindowRef.current = infoWindow;
      setIsInfoWindowOpen(true);

      if (onClick) {
        onClick();
      }
    });

    // Add info window close listener
    infoWindow.addListener('closeclick', () => {
      setIsInfoWindowOpen(false);
      infoWindowRef.current = null;
    });

    markerRef.current = marker;

    // Cleanup function
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      setIsInfoWindowOpen(false);
    };
  }, [map, officeSettings, isLoading]);

  // Update marker visibility
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setVisible(isVisible);
    }
  }, [isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      setIsInfoWindowOpen(false);
    };
  }, []);

  return null; // This component doesn't render anything directly
}

export default OfficeMarker;
