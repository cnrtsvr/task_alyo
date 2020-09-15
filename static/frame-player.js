class FramePlayer {
  constructor(containerId) {
    const elem = document.getElementById(containerId);
    if(!elem) {
      throw new Error('Could not find the element with given id: ' + containerId);
    }
    this.container = elem;
    const imageDiv = document.createElement('div');
    imageDiv.classList.add('image-container');
    this.imageDiv = imageDiv;
    this.container.appendChild(this.imageDiv);

    const progressBarBackground = document.createElement('div');
    progressBarBackground.classList.add('progress-bar-background');
    const progressBar = document.createElement('div');
    progressBar.classList.add('progress-bar');
    this.progressBar = progressBar;
    progressBarBackground.appendChild(progressBar);
    progressBarBackground.addEventListener('click', (e) => {
      this.pause();
      const {layerX} = e;
      e.stopPropagation();
      const frame = Math.floor((layerX / 582) * (25 * 7));
      this.currentImgIdx = Math.floor(frame / 5 / 5);
      this.currentImgRow = Math.floor(frame / 5) % 5;
      this.currentImgCol = Math.floor(frame % 5) % 5;
      this.progress = frame;
      this.imageDiv.replaceChild(this.images[this.currentImgIdx], this.imageDiv.firstChild);
      this.changeShownFrame(null, true);
    });
    this.container.appendChild(progressBarBackground);

    const playPauseIconInProgressBar = document.createElement('i');
    playPauseIconInProgressBar.classList.add('play-pause-progress');
    playPauseIconInProgressBar.classList.add('material-icons-round');
    playPauseIconInProgressBar.classList.add('fade');
    playPauseIconInProgressBar.innerText = 'play_arrow';
    playPauseIconInProgressBar.addEventListener('click', (e) => {
      e.stopPropagation();
      if(this.paused) {
        this.play();
      } else {
        this.pause();
      }
    });
    this.playPauseIconInProgressBar = playPauseIconInProgressBar;
    this.container.appendChild(playPauseIconInProgressBar);

    const playPauseIcon = document.createElement('i');
    playPauseIcon.classList.add('play-pause-overlay');
    playPauseIcon.classList.add('material-icons-round');
    playPauseIcon.classList.add('fade');
    playPauseIcon.innerText = 'play_arrow';
    this.playPauseIcon = playPauseIcon;
    this.container.appendChild(playPauseIcon);

    const loaderOverlay = document.createElement('div');
    loaderOverlay.classList.add('loader-overlay');
    const loader = document.createElement('div');
    loader.classList.add('loader');
    loaderOverlay.appendChild(loader);
    this.loader = loaderOverlay;
    this.container.appendChild(loaderOverlay);

    this.imageDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      if(this.paused) {
        this.play();
      } else {
        this.pause();
      }
    });

    this.fps = 10;
    this.currentImgIdx = 0;
    this.currentImgRow = 0;
    this.currentImgCol = 0;
    this.paused = true;
    this.intervalRef = null;
    this.timeoutRef = null;
    this.images = new Array(7).fill(null);
    this.downloadFinished = false;
    this.eventListeners = {};
    this.progress = 0;
    this.totalProgress = (7 * 25) - 1 // 7 images 25 frames 0-indexed

    this.getImageDownloadPromise = (index) => {
      return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.onload = () => {
          // emulate download
          setTimeout(() => {
            resolve(img);
          }, 2000);
        }
        img.onerror = () => {
          reject('Download Error');
        }
        img.src = `http://localhost:3000/images/${index}.jpg`;
      });
    }

    const t0 = performance.now();
    Promise.all(this.images.map((val, index) => {
      return this.getImageDownloadPromise(index);
    })).then(downloadedImgs => {
      this.images = [...downloadedImgs];
      const t1 = performance.now();
      this.downloadFinished = true;
      this.loader.style.display = 'none';

      const event = new CustomEvent('downloadcomplete', {
        detail: t1 - t0
      });
      this.container.dispatchEvent(event);
      this.imageDiv.appendChild(this.images[0]);
      this.imageDiv.firstChild.style.left = `0`;
      this.imageDiv.firstChild.style.top = `0`;
    });

    this.changeShownFrame = (ms, once = false) => {
      this.timeoutRef = setTimeout(() => {
        if(this.currentImgCol >= 5) {
          this.currentImgCol = 0;
          this.currentImgRow++;
        }
        if(this.currentImgRow >= 5) {
          this.currentImgIdx++;
          if(this.currentImgIdx >= this.images.length) {
            cancelAnimationFrame(this.intervalRef);
            this.intervalRef = null;
            this.currentImgIdx = 0;
            this.currentImgRow = 0;
            this.currentImgCol = 0;
            this.progress = 0;
            clearTimeout(this.timeoutRef);
            this.timeoutRef = null;
            this.paused = true;
            const event = new CustomEvent('end');
            this.container.dispatchEvent(event);
            return;
          }
          this.imageDiv.replaceChild(this.images[this.currentImgIdx], this.imageDiv.firstChild);
          this.currentImgRow = 0;
          this.currentImgCol = 0;
        }
        this.imageDiv.firstChild.style.left = `-${this.currentImgCol * 640}px`;
        this.imageDiv.firstChild.style.top = `-${this.currentImgRow * 360}px`;

        this.currentImgCol++;
        const progressBarWidth = ((this.progress / this.totalProgress) * 582);
        this.progressBar.style.width = `${progressBarWidth}px`;
        this.progress++;
        clearTimeout(this.timeoutRef);
        this.timeoutRef = null;
        if(!once) {
          requestAnimationFrame(this.changeShownFrame);
        }
      },  1000 / this.fps);
    }
    this.changeShownFrame.bind(this);
  }

  on(eventName, cbFunc) {
    this.off(eventName);
    this.eventListeners[eventName] = this.container.addEventListener(eventName, (e) => {
      cbFunc(e.detail);
    });
  }

  off(eventName) {
    if(this.eventListeners[eventName]) {
      this.container.removeEventListener(eventName, this.eventListeners[eventName]);
    }
  }

  play() {
    if(!this.downloadFinished) {
      const _cb = () => {
        this.container.removeEventListener('downloadcomplete', _cb);
        this.play();
      }
      this.container.addEventListener('downloadcomplete', _cb);
      return;
    }
    if(this.paused) {
      this.playPauseIconInProgressBar.innerText = 'pause';
      this.playPauseIcon.style.visibility = 'visible';
      let timeout = setTimeout(() => {
        this.playPauseIcon.style.visibility = 'hidden';
        this.playPauseIcon.innerText = 'pause';
        clearTimeout(timeout);
      }, 1000);
    }
    this.paused = false;

    if(!this.imageDiv.firstChild) {
      this.imageDiv.appendChild(this.images[this.currentImgIdx]);
    }
    if(!this.intervalRef) {
      this.intervalRef = requestAnimationFrame(this.changeShownFrame);
    }
    const t = new Date().getTime();
    const event = new CustomEvent('play', {
      detail: t
    });
    this.container.dispatchEvent(event);
  }

  pause() {
    if(!this.paused) {
      this.playPauseIconInProgressBar.innerText = 'play_arrow';
      this.playPauseIcon.style.visibility = 'visible';
      let timeout = setTimeout(() => {
        this.playPauseIcon.style.visibility = 'hidden';
        this.playPauseIcon.innerText = 'play_arrow';
        clearTimeout(timeout);
      }, 1000);
    }
    this.paused = true;

    cancelAnimationFrame(this.intervalRef);
    this.intervalRef = null;
    clearTimeout(this.timeoutRef);
    this.timeoutRef = null;
    const t = new Date().getTime();
    const event = new CustomEvent('pause', {
      detail: t
    });
    this.container.dispatchEvent(event);
  }
}
