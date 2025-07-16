// Timer Worker for background timer functionality
let timerInterval = null;
let currentTimer = null;

// Send ready signal
self.postMessage({ type: 'WORKER_READY' });

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'START_TIMER':
      startTimer(data.totalTime, data.task);
      break;
      
    case 'PAUSE_TIMER':
      pauseTimer();
      break;
      
    case 'STOP_TIMER':
      stopTimer();
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
};

function startTimer(totalTime, task) {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  currentTimer = {
    remaining: totalTime,
    totalTime: totalTime,
    task: task,
    isRunning: true,
    startTime: Date.now()
  };
  
  // Send initial update
  self.postMessage({
    type: 'TIMER_UPDATE',
    data: {
      remaining: currentTimer.remaining,
      totalTime: currentTimer.totalTime,
      task: currentTimer.task,
      isRunning: currentTimer.isRunning
    }
  });
  
  // Start countdown
  timerInterval = setInterval(() => {
    if (currentTimer && currentTimer.remaining > 0) {
      currentTimer.remaining--;
      
      // Send update
      self.postMessage({
        type: 'TIMER_UPDATE',
        data: {
          remaining: currentTimer.remaining,
          totalTime: currentTimer.totalTime,
          task: currentTimer.task,
          isRunning: currentTimer.isRunning
        }
      });
      
      // Check if timer is complete
      if (currentTimer.remaining <= 0) {
        self.postMessage({
          type: 'TIMER_COMPLETE',
          data: {
            task: currentTimer.task,
            totalTime: currentTimer.totalTime
          }
        });
        
        stopTimer();
      }
    }
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  if (currentTimer) {
    currentTimer.isRunning = false;
    self.postMessage({
      type: 'TIMER_UPDATE',
      data: {
        remaining: currentTimer.remaining,
        totalTime: currentTimer.totalTime,
        task: currentTimer.task,
        isRunning: currentTimer.isRunning
      }
    });
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  currentTimer = null;
  
  self.postMessage({
    type: 'TIMER_STOPPED'
  });
}