// Timer Web Worker - runs in background even when tab is not active

let timerInterval = null;
let startTime = null;
let totalTime = 0;
let isRunning = false;
let task = "";

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'START_TIMER':
      startTime = Date.now();
      totalTime = data.totalTime;
      task = data.task;
      isRunning = true;
      
      // Clear any existing interval
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      // Start the background timer
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = totalTime - elapsed;
        
        if (remaining <= 0) {
          // Timer finished
          clearInterval(timerInterval);
          timerInterval = null;
          isRunning = false;
          
          self.postMessage({
            type: 'TIMER_COMPLETE',
            data: { task, totalTime }
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
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      isRunning = false;
      startTime = null;
      
      self.postMessage({
        type: 'TIMER_STOPPED',
        data: { task }
      });
      break;
      
    case 'PAUSE_TIMER':
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      isRunning = false;
      
      self.postMessage({
        type: 'TIMER_PAUSED',
        data: { task }
      });
      break;
      
    case 'GET_STATUS':
      if (isRunning && startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = totalTime - elapsed;
        
        self.postMessage({
          type: 'TIMER_STATUS',
          data: {
            isRunning,
            remaining: Math.max(0, remaining),
            task,
            totalTime,
            elapsed
          }
        });
      } else {
        self.postMessage({
          type: 'TIMER_STATUS',
          data: {
            isRunning: false,
            remaining: 0,
            task: "",
            totalTime: 0,
            elapsed: 0
          }
        });
      }
      break;
  }
};

// Keep the worker alive
self.postMessage({ type: 'WORKER_READY' });