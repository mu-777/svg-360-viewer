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

  rectImg.addEventListener('mousedown', (e) => {
    isDragging = true;
    startPos.x = e.clientX - currentPos.x;
    startPos.y = e.clientY - currentPos.y;
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      updatePosition('x', halfSize.width);
      if (!isHorizontalLock) {
        updatePosition('y', halfSize.height);
      }
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  resetButton?.addEventListener('click', () => {
    console.log("reset")
    currentPos['x'] = defaultPos['x'];
    currentPos['y'] = defaultPos['y'];
    tilePattern.setAttribute('x', currentPos['x']);
    tilePattern.setAttribute('y', currentPos['y']);
  });
}
