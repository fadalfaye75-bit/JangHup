import { useCallback, useRef } from 'react';

interface LongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
  shouldPreventDefault?: boolean;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  shouldPreventDefault = true
}: LongPressOptions) {
  const timeout = useRef<any>(null);
  const target = useRef<EventTarget | null>(null);

  const start = useCallback((event: any) => {
    if (shouldPreventDefault && event.target) {
      event.target.addEventListener('touchend', preventDefault, { passive: false });
      target.current = event.target;
    }
    
    timeout.current = setTimeout(() => {
      // Simulate vibration
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      onLongPress();
    }, delay);
  }, [onLongPress, delay, shouldPreventDefault]);

  const clear = useCallback((event: any, shouldTriggerClick = true) => {
    timeout.current && clearTimeout(timeout.current);
    shouldTriggerClick && onClick && onClick();
    if (shouldPreventDefault && target.current) {
      target.current.removeEventListener('touchend', preventDefault);
    }
  }, [shouldPreventDefault, onClick]);

  return {
    onMouseDown: (e: any) => start(e),
    onTouchStart: (e: any) => start(e),
    onMouseUp: (e: any) => clear(e),
    onMouseLeave: (e: any) => clear(e, false),
    onTouchEnd: (e: any) => clear(e),
    onTouchCancel: (e: any) => clear(e, false),
  };
}

const preventDefault = (e: Event) => {
  if (!('touches' in e) || (e as TouchEvent).touches.length < 2 && (e.preventDefault(), true)) {
    // Prevent default
  }
};
