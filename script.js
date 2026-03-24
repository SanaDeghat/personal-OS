var biggestIndex = 1;
const dockApps = document.querySelectorAll(".dock-app");
const dockInner = document.querySelector(".dock-inner");
var topBar = document.querySelector("#topMenu");
var selectedIcon = undefined;
const googleDriveApiCred= "637366201812-qa2c55cdjf64e4larta75sraegmdvucv.apps.googleusercontent.com"
const musicLibrary = [
  {
    id: "m1",
    title: "Marsha, Thankk You for the Dialectics, but I Need You to Leave",
    artist: "Will Wood",
    album: "The Normal Album",
    addedAt: "2026-03-14",
    artwork: "music/cover/normal_album.jpg",
    src: "music/Marsha_Thankk_You_for_the_Dialectics.m4a"
  }
];

const musicState = {
  view: "home",
  query: "",
  currentSongId: null,
  selectedArtist: null,
  selectedAlbum: null,
  webResults: [],
  webLoading: false,
  webError: ""
};

let musicRefs = null;
let musicResizeObserver = null;
let itunesSearchTimer = null;
let itunesRequestNonce = 0;

setInterval(function () {
  const timeOpts = { hour: "numeric", minute: "2-digit", hour12: true };
  const dateOpts = { weekday: "short", month: "short", day: "numeric" };
  const now = new Date();
  document.querySelector("#timeElement").innerHTML =
    now.toLocaleDateString("en-US", dateOpts) + " " + now.toLocaleTimeString("en-US", timeOpts);
}, 1000);

function addWindowTapHandling(element) {
  element.addEventListener("mousedown", () => handleWindowTap(element));
}

function handleWindowTap(element) {
  biggestIndex++;
  element.style.zIndex = biggestIndex;
  topBar.style.zIndex = biggestIndex + 1;
  setFocusedDockIcon(element.id);
  if (selectedIcon) {
    deselectIcon(selectedIcon);
  }
}

function closeWindow(elmnt) {
  elmnt.style.display = "none";
  setFocusedDockIcon("");
  updateDockIndicators();
}

function openWindow(windowId) {
  const element = document.getElementById(windowId);
  if (element) {
    element.style.display = "flex";
    biggestIndex++;
    element.style.zIndex = biggestIndex;
    topBar.style.zIndex = biggestIndex + 1;
    setFocusedDockIcon(windowId);
    updateDockIndicators();
    clampWindowToViewport(element);
    bounceDockApp(document.querySelector(`.dock-app[data-window="${windowId}"]`));
  }
}

function updateDockIndicators() {
  dockApps.forEach((app) => {
    const targetWindow = app.getAttribute("data-window");
    const win = document.getElementById(targetWindow);
    const isOpen = !!win && win.style.display !== "none";
    app.classList.toggle("running", isOpen);
  });
}

function setFocusedDockIcon(windowId) {
  dockApps.forEach((app) => {
    const isFocused = !!windowId && app.getAttribute("data-window") === windowId;
    app.classList.toggle("focused", isFocused);
  });
}

function bounceDockApp(app) {
  if (!app || !app.animate) return;
  app.animate(
    [
      { transform: "translateY(0px) scale(1)" },
      { transform: "translateY(-16px) scale(1.08)" },
      { transform: "translateY(0px) scale(1)" }
    ],
    { duration: 380, easing: "ease-out" }
  );
}

function updateDockMagnification(pointerX) {
  const maxDistance = 90;
  const maxLift = 10;

  dockApps.forEach((app) => {
    const rect = app.getBoundingClientRect();
    const iconCenter = rect.left + rect.width / 2;
    const distance = Math.abs(pointerX - iconCenter);
    const influence = Math.max(0, 1 - distance / maxDistance);
    const scale = 1 + 0.5 * influence;
    const lift = maxLift * influence;

    app.style.transform = `translateY(${-lift}px) scale(${scale})`;
  });
}

function resetDockMagnification() {
  dockApps.forEach((app) => {
    app.style.transform = "translateY(0px) scale(1)";
  });
}

function setupDock() {
  dockApps.forEach((app) => {
    app.addEventListener("click", () => {
      const targetWindow = app.getAttribute("data-window");
      const win = document.getElementById(targetWindow);
      if (!win) return;

      if (win.style.display === "none") {
        openWindow(targetWindow);
        return;
      }

      handleWindowTap(win);
    });
  });

  if (dockInner) {
    dockInner.addEventListener("mousemove", (e) => updateDockMagnification(e.clientX));
    dockInner.addEventListener("mouseleave", resetDockMagnification);
  }

  updateDockIndicators();
}

function dragElement(elmnt) {
  var pos1 = 0;
  var pos2 = 0;
  var pos3 = 0;
  var pos4 = 0;
  var header = elmnt.querySelector(".window-header");

  if (header) {
    header.onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    if (e.target.classList.contains("traffic-light") || e.target.classList.contains("window-resize-handle")) {
      return;
    }
    if (elmnt.dataset.maximized === "true") {
      return;
    }
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
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
    clampWindowToViewport(elmnt);
  }

  function stopDragging() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function makeWindowResizable(elmnt) {
  const handle = elmnt.querySelector(".window-resize-handle");
  if (!handle) return;

  handle.addEventListener("mousedown", (e) => {
    if (elmnt.dataset.maximized === "true") return;
    e.preventDefault();
    e.stopPropagation();
    handleWindowTap(elmnt);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = elmnt.offsetWidth;
    const startHeight = elmnt.offsetHeight;
    const minWidth = 320;
    const minHeight = 220;

    function resizeMove(moveEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const maxWidth = window.innerWidth - elmnt.offsetLeft - 8;
      const maxHeight = window.innerHeight - elmnt.offsetTop - 80;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
      const nextHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY));
      elmnt.style.width = nextWidth + "px";
      elmnt.style.height = nextHeight + "px";
    }

    function resizeStop() {
      document.removeEventListener("mousemove", resizeMove);
      document.removeEventListener("mouseup", resizeStop);
    }

    document.addEventListener("mousemove", resizeMove);
    document.addEventListener("mouseup", resizeStop);
  });
}

function clampWindowToViewport(elmnt) {
  if (elmnt.dataset.maximized === "true") return;

  const topMin = 36;
  const sidePadding = 8;
  const bottomPadding = 78;
  const maxLeft = Math.max(sidePadding, window.innerWidth - elmnt.offsetWidth - sidePadding);
  const maxTop = Math.max(topMin, window.innerHeight - elmnt.offsetHeight - bottomPadding);

  let left = parseInt(elmnt.style.left, 10);
  let top = parseInt(elmnt.style.top, 10);

  if (Number.isNaN(left)) left = sidePadding;
  if (Number.isNaN(top)) top = topMin;

  left = Math.min(maxLeft, Math.max(sidePadding, left));
  top = Math.min(maxTop, Math.max(topMin, top));

  elmnt.style.left = left + "px";
  elmnt.style.top = top + "px";
}

function toggleMaximizeWindow(elmnt) {
  if (elmnt.dataset.maximized === "true") {
    elmnt.dataset.maximized = "false";
    elmnt.classList.remove("maximized");
    elmnt.style.left = elmnt.dataset.restoreLeft || "120px";
    elmnt.style.top = elmnt.dataset.restoreTop || "80px";
    elmnt.style.width = elmnt.dataset.restoreWidth || "520px";
    elmnt.style.height = elmnt.dataset.restoreHeight || "420px";
    clampWindowToViewport(elmnt);
    return;
  }

  elmnt.dataset.restoreLeft = elmnt.style.left || elmnt.offsetLeft + "px";
  elmnt.dataset.restoreTop = elmnt.style.top || elmnt.offsetTop + "px";
  elmnt.dataset.restoreWidth = elmnt.style.width || elmnt.offsetWidth + "px";
  elmnt.dataset.restoreHeight = elmnt.style.height || elmnt.offsetHeight + "px";
  elmnt.dataset.maximized = "true";
  elmnt.classList.add("maximized");
  elmnt.style.left = "8px";
  elmnt.style.top = "36px";
  elmnt.style.width = Math.max(320, window.innerWidth - 16) + "px";
  elmnt.style.height = Math.max(220, window.innerHeight - 114) + "px";
  handleWindowTap(elmnt);
}

function selectIcon(element) {
  element.querySelector(".app-icon-container").classList.add("selected");
  selectedIcon = element;
}

function deselectIcon(element) {
  if (element) {
    element.querySelector(".app-icon-container").classList.remove("selected");
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

function createWindow(id, title, contentHTML, startX, startY, startWidth, startHeight) {
  const win = document.createElement("div");
  win.className = "window";
  win.id = id;
  win.style.left = startX + "px";
  win.style.top = startY + "px";
  if (startWidth) win.style.width = startWidth + "px";
  if (startHeight) win.style.height = startHeight + "px";
  win.style.display = "none";
  win.dataset.maximized = "false";
  win.innerHTML = `
    <div class="window-header">
      <div class="traffic-lights">
        <div class="traffic-light close-btn"></div>
        <div class="traffic-light min-btn"></div>
        <div class="traffic-light max-btn"></div>
      </div>
      <div class="window-title">${title}</div>
    </div>
    <div class="window-content">${contentHTML}</div>
    <div class="window-resize-handle"></div>
  `;

  document.body.appendChild(win);
  dragElement(win);
  addWindowTapHandling(win);
  makeWindowResizable(win);

  const closeBtn = win.querySelector(".close-btn");
  closeBtn.addEventListener("click", () => closeWindow(win));

  const minBtn = win.querySelector(".min-btn");
  minBtn.addEventListener("click", () => closeWindow(win));

  const maxBtn = win.querySelector(".max-btn");
  maxBtn.addEventListener("click", () => toggleMaximizeWindow(win));

  clampWindowToViewport(win);
  return win;
}

function initMusicApp() {
  const musicWindow = document.getElementById("musicWindow");
  if (!musicWindow) return;

  const content = musicWindow.querySelector(".window-content");
  content.innerHTML = `
    <div class="music-app-shell" id="musicAppShell">
      <aside class="music-sidebar">
        <button class="music-nav active" data-view="home" type="button">Home</button>
        <button class="music-nav" data-view="search" type="button">Search</button>
        <button class="music-nav" data-view="recent" type="button">Recently Added</button>
        <button class="music-nav" data-view="artists" type="button">Artists</button>
        <button class="music-nav" data-view="albums" type="button">Albums</button>
      </aside>
      <section class="music-main">
        <div class="music-toolbar">
          <input id="musicSearchInput" class="music-search" placeholder="Search songs, artists, albums" type="text" />
          <div class="music-toolbar-actions">
            <button id="musicToggleAddBtn" class="music-add-toggle" type="button">+ Add custom song</button>
          </div>
          <form id="musicAddForm" class="music-add-form hidden">
            <input id="musicAddTitle" class="music-add-input" type="text" placeholder="Song title" required />
            <input id="musicAddArtist" class="music-add-input" type="text" placeholder="Artist" required />
            <input id="musicAddAlbum" class="music-add-input" type="text" placeholder="Album" required />
            <input id="musicAddAudio" class="music-add-input" type="url" placeholder="Audio URL (mp3/stream)" required />
            <input id="musicAddArtwork" class="music-add-input" type="url" placeholder="Artwork URL (optional)" />
            <button class="music-add-submit" type="submit">Save to library</button>
          </form>
        </div>
        <div id="musicContent" class="music-content"></div>
      </section>
    </div>
    <div class="music-player">
      <div class="music-now-playing">
        <p id="musicNowPlayingTitle">Nothing playing</p>
        <p id="musicNowPlayingMeta">Pick a song from any section</p>
      </div>
      <audio id="musicAudio" controls preload="none"></audio>
    </div>
  `;

  musicRefs = {
    shell: content.querySelector("#musicAppShell"),
    navButtons: content.querySelectorAll(".music-nav"),
    searchInput: content.querySelector("#musicSearchInput"),
    addToggleBtn: content.querySelector("#musicToggleAddBtn"),
    addForm: content.querySelector("#musicAddForm"),
    addTitle: content.querySelector("#musicAddTitle"),
    addArtist: content.querySelector("#musicAddArtist"),
    addAlbum: content.querySelector("#musicAddAlbum"),
    addAudio: content.querySelector("#musicAddAudio"),
    addArtwork: content.querySelector("#musicAddArtwork"),
    contentPanel: content.querySelector("#musicContent"),
    audio: content.querySelector("#musicAudio"),
    nowPlayingTitle: content.querySelector("#musicNowPlayingTitle"),
    nowPlayingMeta: content.querySelector("#musicNowPlayingMeta")
  };

  musicRefs.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      musicState.view = button.getAttribute("data-view");
      if (musicState.view !== "artists") musicState.selectedArtist = null;
      if (musicState.view !== "albums") musicState.selectedAlbum = null;
      renderMusicView();
    });
  });

  musicRefs.searchInput.addEventListener("input", (e) => {
    musicState.query = e.target.value.trim();
    musicState.view = "search";
    queueItunesSearch(musicState.query);
    renderMusicView();
  });

  musicRefs.addToggleBtn.addEventListener("click", () => {
    musicRefs.addForm.classList.toggle("hidden");
  });

  musicRefs.addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const song = {
      id: `local-${Date.now()}`,
      title: musicRefs.addTitle.value.trim(),
      artist: musicRefs.addArtist.value.trim(),
      album: musicRefs.addAlbum.value.trim(),
      addedAt: new Date().toISOString().slice(0, 10),
      artwork: musicRefs.addArtwork.value.trim() || "https://cdn-icons-png.flaticon.com/512/727/727245.png",
      src: musicRefs.addAudio.value.trim()
    };

    if (!song.title || !song.artist || !song.album || !song.src) {
      return;
    }

    musicLibrary.unshift(song);
    musicRefs.addForm.reset();
    musicRefs.addForm.classList.add("hidden");
    musicState.view = "recent";
    playSong(song.id);
  });

  musicRefs.contentPanel.addEventListener("click", (e) => {
    const playButton = e.target.closest("[data-play-song]");
    if (playButton) {
      playSong(playButton.getAttribute("data-play-song"));
      return;
    }

    const artistButton = e.target.closest("[data-open-artist]");
    if (artistButton) {
      musicState.view = "artists";
      musicState.selectedArtist = artistButton.getAttribute("data-open-artist");
      renderMusicView();
      return;
    }

    const albumButton = e.target.closest("[data-open-album]");
    if (albumButton) {
      musicState.view = "albums";
      musicState.selectedAlbum = albumButton.getAttribute("data-open-album");
      renderMusicView();
      return;
    }

    const backButton = e.target.closest("[data-go-back]");
    if (backButton) {
      const target = backButton.getAttribute("data-go-back");
      musicState.view = target;
      if (target === "artists") musicState.selectedArtist = null;
      if (target === "albums") musicState.selectedAlbum = null;
      renderMusicView();
    }

    const importButton = e.target.closest("[data-import-web-song]");
    if (importButton) {
      const songId = importButton.getAttribute("data-import-web-song");
      importFromWebResults(songId);
    }
  });

  musicRefs.audio.addEventListener("ended", () => {
    const currentIndex = musicLibrary.findIndex((song) => song.id === musicState.currentSongId);
    if (currentIndex === -1) return;
    const nextSong = musicLibrary[(currentIndex + 1) % musicLibrary.length];
    playSong(nextSong.id);
  });

  if (musicResizeObserver) {
    musicResizeObserver.disconnect();
  }
  musicResizeObserver = new ResizeObserver((entries) => {
    const width = entries[0].contentRect.width;
    musicRefs.shell.classList.toggle("is-compact", width < 760);
    musicRefs.shell.classList.toggle("is-tight", width < 560);
  });
  musicResizeObserver.observe(content);

  renderMusicView();
}

function queueItunesSearch(term) {
  clearTimeout(itunesSearchTimer);

  if (!term || term.length < 2) {
    musicState.webResults = [];
    musicState.webLoading = false;
    musicState.webError = "";
    renderMusicView();
    return;
  }

  musicState.webLoading = true;
  musicState.webError = "";
  renderMusicView();

  itunesSearchTimer = setTimeout(() => {
    searchItunes(term);
  }, 260);
}

async function searchItunes(term) {
  const requestId = ++itunesRequestNonce;
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=12`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Could not fetch songs.");
    }

    const data = await response.json();
    if (requestId !== itunesRequestNonce) return;

    musicState.webResults = (data.results || [])
      .filter((entry) => entry.previewUrl)
      .map((entry) => ({
        id: `web-${entry.trackId}`,
        title: entry.trackName || "Untitled",
        artist: entry.artistName || "Unknown Artist",
        album: entry.collectionName || "Unknown Album",
        artwork: entry.artworkUrl100 || "https://cdn-icons-png.flaticon.com/512/727/727245.png",
        src: entry.previewUrl
      }));

    musicState.webLoading = false;
    musicState.webError = "";
    renderMusicView();
  } catch {
    if (requestId !== itunesRequestNonce) return;
    musicState.webResults = [];
    musicState.webLoading = false;
    musicState.webError = "iTunes search failed. Try again in a moment.";
    renderMusicView();
  }
}

function importFromWebResults(webSongId) {
  const webSong = musicState.webResults.find((entry) => entry.id === webSongId);
  if (!webSong) return;

  const alreadyExists = musicLibrary.some((song) => song.title === webSong.title && song.artist === webSong.artist);
  if (alreadyExists) {
    musicState.view = "recent";
    renderMusicView();
    return;
  }

  musicLibrary.unshift({
    id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: webSong.title,
    artist: webSong.artist,
    album: webSong.album,
    addedAt: new Date().toISOString().slice(0, 10),
    artwork: webSong.artwork,
    src: webSong.src
  });

  musicState.view = "recent";
  renderMusicView();
}

function playSong(songId) {
  if (!musicRefs) return;

  if (ensureWebPreviewPlayable(songId)) {
    return;
  }

  const song = musicLibrary.find((entry) => entry.id === songId);
  if (!song) return;

  musicState.currentSongId = songId;
  if (musicRefs.audio.src !== song.src) {
    musicRefs.audio.src = song.src;
  }
  musicRefs.nowPlayingTitle.textContent = song.title;
  musicRefs.nowPlayingMeta.textContent = `${song.artist} • ${song.album}`;
  musicRefs.audio.play().catch(() => {});
  renderMusicView();
}

function renderMusicView() {
  if (!musicRefs) return;

  musicRefs.navButtons.forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-view") === musicState.view);
  });

  const recentSongs = [...musicLibrary].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  const artistMap = musicLibrary.reduce((acc, song) => {
    if (!acc[song.artist]) acc[song.artist] = [];
    acc[song.artist].push(song);
    return acc;
  }, {});
  const albumMap = musicLibrary.reduce((acc, song) => {
    if (!acc[song.album]) acc[song.album] = [];
    acc[song.album].push(song);
    return acc;
  }, {});

  if (musicState.view === "home") {
    musicRefs.contentPanel.innerHTML = `
      <h3 class="music-title">Home</h3>
      <p class="music-subtitle">Your favorite songs in one cozy place.</p>
      ${renderSongGallery(recentSongs.slice(0, 8), "No songs yet.")}
      <h4 class="music-section-title">Artists</h4>
      <div class="music-chip-grid">
        ${Object.keys(artistMap).slice(0, 6).map((artist) => `<button class="music-chip" type="button" data-open-artist="${escapeHtml(artist)}">${escapeHtml(artist)}</button>`).join("")}
      </div>
      <h4 class="music-section-title">Albums</h4>
      ${renderAlbumGallery(albumMap, Object.keys(albumMap).slice(0, 6))}
    `;
    return;
  }

  if (musicState.view === "search") {
    const normalized = musicState.query.toLowerCase();
    const results = musicLibrary.filter((song) => {
      return (
        song.title.toLowerCase().includes(normalized) ||
        song.artist.toLowerCase().includes(normalized) ||
        song.album.toLowerCase().includes(normalized)
      );
    });

    if (!musicState.query) {
      musicRefs.contentPanel.innerHTML = `
        <h3 class="music-title">Search</h3>
        <p class="music-subtitle">Search my library and iTunes at the same time!!!!</p>
      `;
      return;
    }

    musicRefs.contentPanel.innerHTML = `
      <h3 class="music-title">Search</h3>
      <p class="music-subtitle">Results for "${escapeHtml(musicState.query)}"</p>
      <h4 class="music-section-title">Your Library</h4>
      ${renderSongGallery(results, "No matching songs found.")}
      <h4 class="music-section-title">iTunes Preview Songs</h4>
      ${renderWebSongList()}
    `;
    return;
  }

  if (musicState.view === "recent") {
    musicRefs.contentPanel.innerHTML = `
      <h3 class="music-title">Recently Added</h3>
      <p class="music-subtitle">Newest songs first.</p>
      ${renderSongGallery(recentSongs, "No recent songs yet.")}
    `;
    return;
  }

  if (musicState.view === "artists") {
    if (musicState.selectedArtist) {
      const songs = artistMap[musicState.selectedArtist] || [];
      musicRefs.contentPanel.innerHTML = `
        <button class="music-back" type="button" data-go-back="artists">← Back to all artists</button>
        <h3 class="music-title">${escapeHtml(musicState.selectedArtist)}</h3>
        ${renderSongGallery(songs, "No songs for this artist.")}
      `;
      return;
    }

    musicRefs.contentPanel.innerHTML = `
      <h3 class="music-title">Artists</h3>
      <div class="music-chip-grid">
        ${Object.keys(artistMap).map((artist) => `<button class="music-chip" type="button" data-open-artist="${escapeHtml(artist)}">${escapeHtml(artist)} · ${artistMap[artist].length}</button>`).join("")}
      </div>
    `;
    return;
  }

  if (musicState.view === "albums") {
    if (musicState.selectedAlbum) {
      const songs = albumMap[musicState.selectedAlbum] || [];
      musicRefs.contentPanel.innerHTML = `
        <button class="music-back" type="button" data-go-back="albums">← Back to all albums</button>
        <h3 class="music-title">${escapeHtml(musicState.selectedAlbum)}</h3>
        ${renderSongGallery(songs, "No songs for this album.")}
      `;
      return;
    }

    musicRefs.contentPanel.innerHTML = `
      <h3 class="music-title">Albums</h3>
      ${renderAlbumGallery(albumMap)}
    `;
  }
}

function renderSongGallery(songs, emptyText) {
  if (!songs.length) {
    return `<p class="music-empty">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <div class="music-gallery-grid">
      ${songs.map((song) => {
        const activeClass = song.id === musicState.currentSongId ? "active" : "";
        return `
          <button class="music-song-card ${activeClass}" type="button" data-play-song="${song.id}">
            <img src="${song.artwork}" class="music-artwork-lg" alt="${escapeHtml(song.title)}" />
            <span class="music-song-card-meta">
              <strong>${escapeHtml(song.title)}</strong>
              <small>${escapeHtml(song.artist)}</small>
              <small>${escapeHtml(song.album)}</small>
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderAlbumGallery(albumMap, onlyAlbums) {
  const albumNames = onlyAlbums || Object.keys(albumMap);
  if (!albumNames.length) {
    return `<p class="music-empty">No albums yet.</p>`;
  }

  return `
    <div class="music-gallery-grid albums">
      ${albumNames.map((albumName) => {
        const songs = albumMap[albumName] || [];
        const coverSong = songs[0];
        const artwork = coverSong?.artwork || "https://cdn-icons-png.flaticon.com/512/727/727245.png";
        const artist = coverSong?.artist || "Unknown Artist";
        return `
          <button class="music-album-card" type="button" data-open-album="${escapeHtml(albumName)}">
            <img src="${artwork}" class="music-artwork-lg" alt="${escapeHtml(albumName)}" />
            <span class="music-song-card-meta">
              <strong>${escapeHtml(albumName)}</strong>
              <small>${escapeHtml(artist)}</small>
              <small>${songs.length} track${songs.length === 1 ? "" : "s"}</small>
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderWebSongList() {
  if (musicState.webLoading) {
    return `<p class="music-empty">Searching iTunes…</p>`;
  }

  if (musicState.webError) {
    return `<p class="music-empty">${escapeHtml(musicState.webError)}</p>`;
  }

  if (!musicState.webResults.length) {
    return `<p class="music-empty">No iTunes preview songs found yet.</p>`;
  }

  return `
    <div class="music-gallery-grid web-grid">
      ${musicState.webResults.map((song) => {
        return `
          <div class="music-web-card">
            <img src="${song.artwork}" class="music-artwork-lg" alt="${escapeHtml(song.title)}" />
            <span class="music-song-card-meta">
              <strong>${escapeHtml(song.title)}</strong>
              <small>${escapeHtml(song.artist)}</small>
              <small>${escapeHtml(song.album)}</small>
            </span>
            <div class="music-row-actions">
              <button class="music-mini-btn" type="button" data-play-song="${song.id}">Play</button>
              <button class="music-mini-btn" type="button" data-import-web-song="${song.id}">Add</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function ensureWebPreviewPlayable(songId) {
  const webSong = musicState.webResults.find((entry) => entry.id === songId);
  if (!webSong) return false;
  musicState.currentSongId = songId;
  if (musicRefs.audio.src !== webSong.src) {
    musicRefs.audio.src = webSong.src;
  }
  musicRefs.nowPlayingTitle.textContent = webSong.title;
  musicRefs.nowPlayingMeta.textContent = `${webSong.artist} • ${webSong.album} (Preview)`;
  musicRefs.audio.play().catch(() => {});
  renderMusicView();
  return true;
}

window.addEventListener("resize", () => {
  document.querySelectorAll(".window").forEach((win) => {
    if (win.dataset.maximized === "true") {
      win.style.width = Math.max(320, window.innerWidth - 16) + "px";
      win.style.height = Math.max(220, window.innerHeight - 114) + "px";
    } else {
      clampWindowToViewport(win);
    }
  });
});

createWindow(
  "welcomeWindow",
  "About Me",
  `<h2>About Me</h2>
    <p>Hi! I'm Sana. I procrastinate, a LOT.</p>
    <img class="profile-pic" src="https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg">
    <p>The photo above is a dog</p>
    <p>Check out my <a href="https://github.com/">GitHub??? why not</a></p>`,
  170,
  90,
  460,
  460
);

createWindow(
  "musicWindow",
  "Music",
  `<div class="music-loading">Loading Music…</div>`,
  210,
  85,
  980,
  640
);

createWindow(
  "notesWindow",
  "Notes",
  `<h2>This is a notes app</h2>
    <p>and this is a note</p>`,
  90,
  120,
  420,
  320
);

setupDock();
initMusicApp();
openWindow("musicWindow");

createWindow(
  "photosWindow",
  "Photos",
  `<div class="photos-app-shell" style="height: 100%; display: flex; flex-direction: column;">
    <div class="photos-header">
      <span id="photosStatus" style="font-size: 14px; color: #fff;">Loading photos...</span>
    </div>
    <div id="photosGallery" class="photos-gallery"></div>
  </div>`,
  250, 100, 700, 500
);
var GOOGLE_API_KEY = "AIzaSyBZL5XH_2Y1VeW1rpsjp5xNNP2k7Odg9ww";
var FOLDER_ID = "1qZx2dftDi5gfXB6uMNWacgArf9uva3RZ"; 
async function initPhotosApp() {
  const gallery = document.getElementById("photosGallery");
  const status = document.getElementById("photosStatus");
  
  try {
    const query = `'${FOLDER_ID}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      status.innerText = "Error: " + data.error.message;
      return;
    }

    const files = data.files || [];
    
    if (files.length === 0) {
      status.innerText = "No photos or videos found in this folder.";
      return;
    }

    status.innerText = `${files.length} items loaded.`;

    files.forEach(file => {
      const item = document.createElement("div");
      
      if (file.mimeType.includes('image')) {
        const imgUrl = file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s800') : '';
        item.innerHTML = `<img src="${imgUrl}" alt="${file.name}" loading="lazy" />`;
      } else if (file.mimeType.includes('video')) {
        item.innerHTML = `
          <video controls preload="metadata">
             <source src="${file.webContentLink}" type="${file.mimeType}">
          </video>`;
      }
      gallery.appendChild(item);
    });

  } catch (err) {
    status.innerText = "Error loading files.";
    console.error(err);
  }
}

initPhotosApp();
openWindow("photosWindow");