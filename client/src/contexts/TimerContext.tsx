import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

interface TimerContextType {
  // Timer state
  isRunning: boolean;
  timeLeft: number;
  totalTime: number;
  currentTask: string;
  isVisible: boolean;
  
  // Timer actions
  startTimer: (task: string, duration: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  hideTimer: () => void;
  completeTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [currentTask, setCurrentTask] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker for background timing
  useEffect(() => {
    if (typeof window !== "undefined" && window.Worker) {
      try {
        const worker = new Worker('/timer-worker.js');
        workerRef.current = worker;
        
        worker.onmessage = function(e) {
          const { type, data } = e.data;
          
          switch (type) {
            case 'TIMER_UPDATE':
              setTimeLeft(data.remaining);
              setCurrentTask(data.task);
              setTotalTime(data.totalTime);
              setIsRunning(data.isRunning);
              break;
              
            case 'TIMER_COMPLETE':
              console.log("Timer completed in background worker");
              setIsRunning(false);
              setTimeLeft(0);
              // Timer completion will be handled by the GlobalTimer component
              break;
              
            case 'TIMER_STOPPED':
              setIsRunning(false);
              break;
              
            case 'WORKER_READY':
              console.log("Global timer worker ready");
              break;
          }
        };
        
        return () => {
          if (worker) {
            worker.terminate();
          }
        };
      } catch (e) {
        console.log("Could not create timer worker:", e);
      }
    }
  }, []);

  // Fallback interval timer (for cases where Web Worker fails)
  useEffect(() => {
    if (isRunning && timeLeft > 0 && !workerRef.current) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeLeft]);

  // localStorage persistence
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      const timerData = {
        startTime: Date.now() - (totalTime - timeLeft) * 1000,
        totalTime,
        task: currentTask,
        isRunning: true
      };
      localStorage.setItem('global-timer', JSON.stringify(timerData));
    } else if (!isRunning) {
      localStorage.removeItem('global-timer');
    }
  }, [isRunning, timeLeft, totalTime, currentTask]);

  // Restore timer on page load
  useEffect(() => {
    const savedTimer = localStorage.getItem('global-timer');
    if (savedTimer) {
      try {
        const timerData = JSON.parse(savedTimer);
        const now = Date.now();
        const elapsed = now - timerData.startTime;
        const remainingTime = timerData.totalTime - Math.floor(elapsed / 1000);
        
        if (remainingTime > 0 && timerData.isRunning) {
          setCurrentTask(timerData.task);
          setTimeLeft(remainingTime);
          setTotalTime(timerData.totalTime);
          setIsRunning(true);
          setIsVisible(true);
        }
      } catch (e) {
        console.log("Error restoring timer:", e);
        localStorage.removeItem('global-timer');
      }
    }
  }, []);

  const startTimer = useCallback((task: string, duration: number) => {
    setCurrentTask(task);
    setTimeLeft(duration);
    setTotalTime(duration);
    setIsRunning(true);
    setIsVisible(true);
    
    // Start Web Worker timer
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'START_TIMER',
        data: {
          totalTime: duration,
          task: task
        }
      });
    }
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'PAUSE_TIMER' });
    }
  }, []);

  const resumeTimer = useCallback(() => {
    setIsRunning(true);
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'START_TIMER',
        data: {
          totalTime: timeLeft,
          task: currentTask
        }
      });
    }
  }, [timeLeft, currentTask]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(0);
    setTotalTime(0);
    setCurrentTask("");
    setIsVisible(false);
    
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP_TIMER' });
    }
    
    localStorage.removeItem('global-timer');
  }, []);

  const hideTimer = useCallback(() => {
    setIsVisible(false);
  }, []);

  const completeTimer = useCallback(() => {
    // Timer completion is handled by the components
    // This is just a placeholder for completion logic
  }, []);

  return (
    <TimerContext.Provider
      value={{
        isRunning,
        timeLeft,
        totalTime,
        currentTask,
        isVisible,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        hideTimer,
        completeTimer
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}