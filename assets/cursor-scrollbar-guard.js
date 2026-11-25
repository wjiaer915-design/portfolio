(() => {
  const cursor = document.getElementById('cursor');
  const finePointer = window.matchMedia('(pointer: fine) and (hover: hover)');
  if (!cursor || !finePointer.matches) return;

  const hiddenClass = 'cursor--native-scrollbar';
  const style = document.createElement('style');
  style.textContent = `#cursor.${hiddenClass} { opacity: 0 !important; }`;
  document.head.append(style);

  const scrollingElement = document.scrollingElement || document.documentElement;
  let draggingScrollbar = false;

  const isScrollable = element => {
    if (!(element instanceof Element)) return false;
    const styles = getComputedStyle(element);
    const overflowY = element === scrollingElement ? 'scroll' : styles.overflowY;
    return /(auto|scroll|overlay)/.test(overflowY)
      && element.scrollHeight > element.clientHeight + 1;
  };

  const getCandidates = (x, y) => {
    const candidates = new Set([scrollingElement]);
    const safeX = Math.min(Math.max(x, 0), Math.max(0, window.innerWidth - 1));
    const safeY = Math.min(Math.max(y, 0), Math.max(0, window.innerHeight - 1));

    document.elementsFromPoint(safeX, safeY).forEach(element => {
      for (let node = element; node instanceof Element; node = node.parentElement) {
        candidates.add(node);
      }
    });
    return candidates;
  };

  const isInScrollbarZone = (x, y) => {
    for (const element of getCandidates(x, y)) {
      if (!isScrollable(element)) continue;

      const isRoot = element === scrollingElement;
      const rect = isRoot
        ? { left: 0, right: document.documentElement.clientWidth, top: 0, bottom: window.innerHeight }
        : element.getBoundingClientRect();
      const nativeGutter = isRoot
        ? Math.max(0, window.innerWidth - document.documentElement.clientWidth)
        : Math.max(0, element.offsetWidth - element.clientWidth);
      const guardWidth = Math.max(30, nativeGutter + 10);
      const insideY = y >= rect.top && y <= rect.bottom;
      const nearRightEdge = x >= rect.right - guardWidth && x <= rect.right + 2;

      if (insideY && nearRightEdge) return true;
    }
    return false;
  };

  const setHidden = hidden => cursor.classList.toggle(hiddenClass, hidden);

  window.addEventListener('pointermove', event => {
    if (draggingScrollbar && (event.buttons & 1) === 0) draggingScrollbar = false;
    setHidden(draggingScrollbar || isInScrollbarZone(event.clientX, event.clientY));
  }, { capture: true, passive: true });

  window.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !isInScrollbarZone(event.clientX, event.clientY)) return;
    draggingScrollbar = true;
    setHidden(true);
  }, { capture: true, passive: true });

  const releaseScrollbar = () => {
    draggingScrollbar = false;
  };

  window.addEventListener('pointerup', releaseScrollbar, { capture: true, passive: true });
  window.addEventListener('pointercancel', releaseScrollbar, { capture: true, passive: true });
  window.addEventListener('blur', () => {
    draggingScrollbar = false;
    setHidden(true);
  });
})();
