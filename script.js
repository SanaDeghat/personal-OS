var biggestIndex = 1;
const allWindows = document.querySelectorAll(".window");
const allCloseButtons = document.querySelectorAll(".close-btn");
var topBar = document.querySelector("#topMenu");
var selectedIcon = undefined;

setInterval(function () {
  const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
  const dateOpts = { weekday: 'short', month: 'short', day: 'numeric' };
  const now = new Date();
  document.querySelector("#timeElement").innerHTML = 
    now.toLocaleDateString('en-US', dateOpts) + " " + now.toLocaleTimeString('en-US', timeOpts);
}, 1000);

allWindows.forEach((win) => {
    dragElement(win);
    addWindowTapHandling(win);
});

function addWindowTapHandling(element) {
  element.addEventListener("mousedown", () => handleWindowTap(element));
}

function handleWindowTap(element) {
  biggestIndex++; 
  element.style.zIndex = biggestIndex;
  topBar.style.zIndex = biggestIndex + 1;
  if (selectedIcon) {
    deselectIcon(selectedIcon);
  }
}

allCloseButtons.forEach((btn) => {
  btn.addEventListener("click", function() {
   const windowToClose = this.closest(".window");
   closeWindow(windowToClose);
  });
});

function closeWindow(elmnt) {
  elmnt.style.display = "none";
}

function openWindow(windowId) {
  const element = document.getElementById(windowId);
  if (element) {
    element.style.display = "flex";
    biggestIndex++;
    element.style.zIndex = biggestIndex;
    topBar.style.zIndex = biggestIndex + 1;
  }
}

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  var header = elmnt.querySelector(".window-header");

  if (header) {
    header.onmousedown = dragMouseDown;
  } else { 
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    if (e.target.classList.contains('traffic-light')) return;
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = stopDragging;
    document.onmousemove = elementDrag;
    handleWindowTap(elmnt);
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function stopDragging() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function selectIcon(element) {
  element.querySelector('.app-icon-container').classList.add("selected");
  selectedIcon = element;
} 

function deselectIcon(element) {
  if (element) {
    element.querySelector('.app-icon-container').classList.remove("selected");
    selectedIcon = undefined;
  }
}

function handleIconTap(element) {
  const targetWindow = element.getAttribute("data-window");
  if (selectedIcon === element) {
    deselectIcon(element);
    openWindow(targetWindow);
  } else {
    if (selectedIcon) deselectIcon(selectedIcon);
    selectIcon(element);
  }
}

document.addEventListener("mousedown", (e) => {
  if (!e.target.closest(".desktop-app") && selectedIcon) {
    deselectIcon(selectedIcon);
  }
});