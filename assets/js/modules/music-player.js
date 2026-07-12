const ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z"/></svg>',
  volume: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h18v-2H7v2zm0 4h18v-2H7v2zM7 7v2h18V7H7z"/></svg>',
};

const PLAY_MODES = [
  {
    id: 'pause',
    label: '播完暂停',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6h3v12H8V6zm5 0h3v12h-3V6z"/></svg>',
  },
  {
    id: 'single',
    label: '单曲循环',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-1-9h-1V7h-6v2h4v2h3z"/></svg>',
  },
  {
    id: 'order',
    label: '列表顺序',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
  },
  {
    id: 'shuffle',
    label: '随机播放',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
  },
  {
    id: 'loop',
    label: '列表循环',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
  },
];

let playlist = [];
let currentIndex = 0;
let isExpanded = false;
let isPlaylistOpen = false;
let modeIndex = PLAY_MODES.findIndex(m => m.id === 'loop');

function getPlayMode() {
  return PLAY_MODES[modeIndex];
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getElements() {
  return {
    root: document.getElementById('music-player'),
    audio: document.getElementById('music-player-audio'),
    title: document.getElementById('music-player-title'),
    progress: document.getElementById('music-player-progress'),
    progressBar: document.getElementById('music-player-progress-bar'),
    currentTime: document.getElementById('music-player-current'),
    duration: document.getElementById('music-player-duration'),
    playBtn: document.getElementById('music-player-play'),
    prevBtn: document.getElementById('music-player-prev'),
    nextBtn: document.getElementById('music-player-next'),
    volume: document.getElementById('music-player-volume'),
    toggleBtn: document.getElementById('music-player-toggle'),
    listToggleBtn: document.getElementById('music-player-list-toggle'),
    playlistPanel: document.getElementById('music-player-playlist'),
    playlistCount: document.getElementById('music-player-playlist-count'),
    playlistItems: document.getElementById('music-player-playlist-items'),
    miniBtn: document.getElementById('music-player-mini'),
    modeBtn: document.getElementById('music-player-mode'),
    modeIcon: document.getElementById('music-player-mode-icon'),
    modeLabel: document.getElementById('music-player-mode-label'),
  };
}

function updatePlayIcon(els, playing) {
  els.playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
  els.root.classList.toggle('is-playing', playing);
  updatePlaylistActive(els);
}

function updateModeUI(els) {
  const mode = getPlayMode();
  els.modeIcon.innerHTML = mode.icon;
  els.modeLabel.textContent = mode.label;
  els.modeBtn.setAttribute('aria-label', `播放模式：${mode.label}`);
  els.modeBtn.title = mode.label;
  els.root.dataset.playMode = mode.id;
}

function loadTrack(index) {
  const els = getElements();
  const track = playlist[index];
  if (!track) return;

  currentIndex = index;
  els.audio.src = track.src;
  els.title.textContent = track.title;
  els.progress.value = 0;
  els.progressBar.style.width = '0%';
  els.currentTime.textContent = '0:00';
  els.duration.textContent = '0:00';
  updatePlayIcon(els, false);
  updatePlaylistActive(els);
}

function selectTrack(index, autoPlay = true) {
  if (!playlist[index]) return;
  const wasPlaying = !getElements().audio.paused;
  loadTrack(index);
  if (autoPlay || wasPlaying) playTrack();
}

function renderPlaylist(els) {
  els.playlistItems.innerHTML = '';
  els.playlistCount.textContent = `${playlist.length} 首`;

  playlist.forEach((track, index) => {
    const item = document.createElement('li');
    item.className = 'music-player__playlist-item';
    item.dataset.index = index;
    item.innerHTML = `
      <span class="music-player__playlist-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="music-player__playlist-meta">
        <span class="music-player__playlist-name">${track.title}</span>
      </span>
      <span class="music-player__playlist-status" aria-hidden="true">
        <span></span><span></span><span></span>
      </span>
    `;
    item.addEventListener('click', () => selectTrack(index));
    item.addEventListener('mouseenter', () => navigator.vibrate?.(8));
    els.playlistItems.appendChild(item);
  });

  updatePlaylistActive(els);
}

function updatePlaylistActive(els) {
  els.playlistItems.querySelectorAll('.music-player__playlist-item').forEach((item, index) => {
    const isActive = index === currentIndex;
    item.classList.toggle('is-active', isActive);
    item.classList.toggle('is-playing', isActive && !els.audio.paused);
    item.setAttribute('aria-current', isActive ? 'true' : 'false');
  });

  const activeItem = els.playlistItems.querySelector('.music-player__playlist-item.is-active');
  if (activeItem && isPlaylistOpen) {
    activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function setPlaylistOpen(open) {
  const els = getElements();
  isPlaylistOpen = open;
  els.playlistPanel.hidden = !open;
  els.root.classList.toggle('is-playlist-open', open);
  els.listToggleBtn.setAttribute('aria-expanded', String(open));
  els.listToggleBtn.setAttribute('aria-label', open ? '收起播放列表' : '展开播放列表');
  if (open) updatePlaylistActive(els);
}

function togglePlaylist() {
  setPlaylistOpen(!isPlaylistOpen);
}

function playTrack() {
  const els = getElements();
  els.audio.play().then(() => updatePlayIcon(els, true)).catch(() => {
    updatePlayIcon(els, false);
  });
}

function pauseTrack() {
  const els = getElements();
  els.audio.pause();
  updatePlayIcon(els, false);
}

function togglePlay() {
  const els = getElements();
  if (!playlist.length) return;
  if (els.audio.paused) playTrack();
  else pauseTrack();
}

function playRandomTrack(excludeIndex = currentIndex) {
  if (!playlist.length) return;
  if (playlist.length === 1) {
    loadTrack(0);
    playTrack();
    return;
  }
  let next;
  do {
    next = Math.floor(Math.random() * playlist.length);
  } while (next === excludeIndex);
  loadTrack(next);
  playTrack();
}

function playNext() {
  if (!playlist.length) return;
  const mode = getPlayMode().id;
  if (mode === 'shuffle') {
    playRandomTrack();
    return;
  }
  const nextIndex = (currentIndex + 1) % playlist.length;
  loadTrack(nextIndex);
  playTrack();
}

function playPrev() {
  if (!playlist.length) return;
  const els = getElements();
  if (els.audio.currentTime > 3) {
    els.audio.currentTime = 0;
    return;
  }
  const mode = getPlayMode().id;
  if (mode === 'shuffle') {
    playRandomTrack();
    return;
  }
  const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prevIndex);
  playTrack();
}

function handleTrackEnded() {
  const els = getElements();
  const mode = getPlayMode().id;

  switch (mode) {
    case 'pause':
      els.audio.currentTime = 0;
      pauseTrack();
      break;
    case 'single':
      els.audio.currentTime = 0;
      playTrack();
      break;
    case 'order':
      if (currentIndex < playlist.length - 1) {
        loadTrack(currentIndex + 1);
        playTrack();
      } else {
        els.audio.currentTime = 0;
        pauseTrack();
      }
      break;
    case 'shuffle':
      playRandomTrack();
      break;
    case 'loop':
      loadTrack((currentIndex + 1) % playlist.length);
      playTrack();
      break;
  }
}

function cyclePlayMode() {
  const els = getElements();
  modeIndex = (modeIndex + 1) % PLAY_MODES.length;
  updateModeUI(els);
  localStorage.setItem('music-player-mode', getPlayMode().id);
}

function setExpanded(expanded) {
  const els = getElements();
  isExpanded = expanded;
  els.root.classList.toggle('is-collapsed', !expanded);
  els.toggleBtn.innerHTML = expanded ? ICONS.chevron : ICONS.music;
  els.toggleBtn.setAttribute('aria-label', expanded ? '收起播放器' : '展开播放器');
  if (!expanded) setPlaylistOpen(false);
}

function bindEvents(els) {
  els.playBtn.addEventListener('click', togglePlay);
  els.prevBtn.addEventListener('click', playPrev);
  els.nextBtn.addEventListener('click', playNext);
  els.modeBtn.addEventListener('click', cyclePlayMode);
  els.listToggleBtn.addEventListener('click', togglePlaylist);
  els.miniBtn.addEventListener('click', () => setExpanded(true));
  els.toggleBtn.addEventListener('click', () => setExpanded(!isExpanded));

  els.audio.addEventListener('loadedmetadata', () => {
    els.duration.textContent = formatTime(els.audio.duration);
  });

  els.audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = els.audio;
    if (!duration) return;
    const pct = (currentTime / duration) * 100;
    els.progress.value = pct;
    els.progressBar.style.width = `${pct}%`;
    els.currentTime.textContent = formatTime(currentTime);
  });

  els.audio.addEventListener('ended', handleTrackEnded);

  els.progress.addEventListener('input', () => {
    if (!els.audio.duration) return;
    const time = (els.progress.value / 100) * els.audio.duration;
    els.audio.currentTime = time;
    els.progressBar.style.width = `${els.progress.value}%`;
    els.currentTime.textContent = formatTime(time);
  });

  const savedVolume = localStorage.getItem('music-player-volume');
  if (savedVolume !== null) {
    els.volume.value = savedVolume;
    els.audio.volume = savedVolume / 100;
  }

  els.volume.addEventListener('input', () => {
    els.audio.volume = els.volume.value / 100;
    localStorage.setItem('music-player-volume', els.volume.value);
  });

  [els.playBtn, els.prevBtn, els.nextBtn, els.toggleBtn, els.listToggleBtn, els.miniBtn, els.modeBtn].forEach(btn => {
    btn.addEventListener('mouseenter', () => navigator.vibrate?.(8));
  });
}

function showEmptyState(els) {
  els.title.textContent = '暂无音乐';
  els.playBtn.disabled = true;
  els.prevBtn.disabled = true;
  els.nextBtn.disabled = true;
  els.modeBtn.disabled = true;
  els.listToggleBtn.disabled = true;
  els.playlistCount.textContent = '0 首';
  els.playlistItems.innerHTML = '<li class="music-player__playlist-empty">暂无曲目</li>';
}

function initIcons(els) {
  els.playBtn.innerHTML = ICONS.play;
  els.prevBtn.innerHTML = ICONS.prev;
  els.nextBtn.innerHTML = ICONS.next;
  els.toggleBtn.innerHTML = ICONS.chevron;
  els.listToggleBtn.innerHTML = ICONS.list;
  els.miniBtn.innerHTML = ICONS.music;
  els.root.querySelector('.music-player__volume-icon').innerHTML = ICONS.volume;
}

function initPlayMode(els) {
  const savedMode = localStorage.getItem('music-player-mode');
  const savedIndex = PLAY_MODES.findIndex(m => m.id === savedMode);
  if (savedIndex >= 0) modeIndex = savedIndex;
  updateModeUI(els);
}

export async function initMusicPlayer() {
  const els = getElements();
  if (!els.root) return;

  initIcons(els);
  initPlayMode(els);
  bindEvents(els);
  setExpanded(false);
  els.audio.volume = els.volume.value / 100;

  try {
    const res = await fetch('assets/audio/playlist.json');
    if (!res.ok) throw new Error('playlist not found');
    playlist = await res.json();

    const validTracks = [];
    for (const track of playlist) {
      const check = await fetch(track.src, { method: 'HEAD' });
      if (check.ok) validTracks.push(track);
    }
    playlist = validTracks;

    if (!playlist.length) {
      showEmptyState(els);
      return;
    }

    renderPlaylist(els);
    loadTrack(0);
  } catch {
    showEmptyState(els);
  }
}