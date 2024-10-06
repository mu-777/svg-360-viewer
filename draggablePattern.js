function draggablePattern(rectImgId, tilePatternId, halfWidth, halfHeight, lockSwitchId = null, resetButtonId = null) {
  const halfSize = { width: halfWidth, height: halfHeight };
  const rectImg = document.getElementById(rectImgId);
  const tilePattern = document.getElementById(tilePatternId);
  const lockSwitch = lockSwitchId ? document.getElementById(lockSwitchId) : null;
  const resetButton = resetButtonId ? document.getElementById(resetButtonId) : null;

  let isDragging = false;
  let isHorizontalLock = lockSwitch ? lockSwitch.checked : true;
  let startPos = { x: 0, y: 0 };
  let defaultPos = { x: parseInt(tilePattern.getAttribute('x')), y: parseInt(tilePattern.getAttribute('y')) };
  let currentPos = { x: parseInt(tilePattern.getAttribute('x')), y: parseInt(tilePattern.getAttribute('y')) };

  const updatePosition = (axis, halfSize) => {
    currentPos[axis] = event[`client${axis.toUpperCase()}`] - startPos[axis];
    if (currentPos[axis] > halfSize) {
      currentPos[axis] = -halfSize;
      startPos[axis] = event[`client${axis.toUpperCase()}`] - currentPos[axis];
    } else if (currentPos[axis] < -halfSize) {
      currentPos[axis] = halfSize;
      startPos[axis] = event[`client${axis.toUpperCase()}`] - currentPos[axis];
    }
    tilePattern.setAttribute(axis, currentPos[axis]);
  };

  lockSwitch?.addEventListener('click', () => {
    isHorizontalLock = lockSwitch.checked;
    if (isHorizontalLock) {
      currentPos.y = defaultPos['y'];
      tilePattern.setAttribute('y', 0);
    }
  });

  const startDrag = (clientX, clientY) => {
    isDragging = true;
    startPos.x = clientX - currentPos.x;
    startPos.y = clientY - currentPos.y;
  };
  rectImg.addEventListener('mousedown', (e) => {
    startDrag(e.clientX, e.clientY);
  });
  rectImg.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  });

  const moveDrag = (clientX, clientY) => {
    if (isDragging) {
      updatePosition('x', halfSize.width, clientX);
      if (!isHorizontalLock) {
        updatePosition('y', halfSize.height, clientY);
      }
    }    
  };
  window.addEventListener('mousemove', (e) => {
    moveDrag(e.clientX, e.clientY);
  });
  window.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  });

  const stopDrag = () => {
    isDragging = false;
  };
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchend', stopDrag);

  resetButton?.addEventListener('click', () => {
    console.log("reset")
    currentPos['x'] = defaultPos['x'];
    currentPos['y'] = defaultPos['y'];
    tilePattern.setAttribute('x', currentPos['x']);
    tilePattern.setAttribute('y', currentPos['y']);
  });
}
