
      const { initializeTelegramReminderJob, getTelegramReminderJobStatus, triggerTelegramReminderJob } = require('./src/jobs/telegramReminderJob.ts');
      
      async function test() {
        try {
          console.log('✅ Job functions imported successfully');
          
          // Test initialization (this will register the job)
          await initializeTelegramReminderJob();
          console.log('✅ Job initialization completed');
          
          // Test getting job status
          const status = await getTelegramReminderJobStatus();
          console.log('✅ Job status retrieved:', {
            jobName: status.job.name,
            cronExpression: status.job.cronExpression,
            enabled: status.job.enabled,
            stats: status.stats
          });
          
          // Test manual triggering (with test mode)
          const execution = await triggerTelegramReminderJob({
            testMode: true,
            forceSend: true,
            timeWindow: 15
          });
          console.log('✅ Job triggered manually:', {
            executionId: execution.id,
            status: execution.status
          });
          
          console.log('🎉 All tests passed!');
          
        } catch (error) {
          console.error('❌ Test failed:', error.message);
          process.exit(1);
        }
      }
      
      test();
    