let jobQueue = [];

function addNotificationJob(event) {
  jobQueue.push(event);
  console.log('Job queued:', event.type, 'Event:', event);

  // Simulate async worker
  setTimeout(() => {
    const job = jobQueue.shift();
    if (job) {
      console.log('Processing job:', job);
      const { handleNotification } = require('./notificationWorker');
      handleNotification(job);
    } else {
      console.log('No job to process');
    }
  }, 500); // simulate processing delay
}

module.exports = { addNotificationJob };
