// Simple Timer Web Worker - runs in background even when tab is not active

let timerInterval = null;
let startTime = null;
let totalTime = 0;
let isRunning = false;
let task = "";

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'START_TIMER':
      console.log('Worker: Starting timer for', data.totalTime, 'seconds');
      startTime = Date.now();
      totalTime = data.totalTime;
      task = data.task;
      isRunning = true;
      
      // Clear any existing interval
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      // Start the background timer - send updates every second
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, totalTime - elapsed);
        
        if (remaining <= 0) {
          // Timer finished
          console.log('Worker: Timer completed');
          clearInterval(timerInterval);
          timerInterval = null;
          isRunning = false;
          
          self.postMessage({
            type: 'TIMER_COMPLETE',
            data: { task, totalTime, elapsed }
          });
        } else {
          // Timer still running - send update
          self.postMessage({
            type: 'TIMER_UPDATE',
            data: { 
              remaining, 
              task, 
              totalTime,
              elapsed,
              isRunning: true
            }
          });
        }
      }, 1000);
      
      break;
      
    case 'STOP_TIMER':
      console.log('Worker: Stopping timer');
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      isRunning = false;
      startTime = null;
      task = "";
      
      self.postMessage({
        type: 'TIMER_STOPPED'
      });
      break;
  }
};

// Notify main thread that worker is ready
self.postMessage({ type: 'WORKER_READY' });