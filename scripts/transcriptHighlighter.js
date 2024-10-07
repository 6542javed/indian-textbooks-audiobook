class TranscriptHighlighter {
  /**
   * Initializes the TranscriptHighlighter.
   * @param {Object} config - Configuration object.
   * @param {string} config.filePath - Path to the SRT file.
   * @param {HTMLAudioElement} config.audioElement - Audio element.
   * @param {HTMLElement} config.transcriptElement - Transcript container element.
   * @param {Set<number>} config.paragraphBreaks - Set of word indices for paragraph breaks.
   */
  constructor({ filePath, audioElement, transcriptElement, paragraphBreaks }) {
      this.filePath = filePath;
      this.audioElement = audioElement;
      this.transcriptElement = transcriptElement;
      this.paragraphBreaks = paragraphBreaks;
      this.parsedSRT = [];
      this.currentWordIndex = -1;
      this.init();
  }

  /**
   * Fetches and initializes the transcript.
   */
  async init() {
      const srtContent = await this.fetchSRT(this.filePath);
      if (!srtContent) {
          this.transcriptElement.innerHTML = '<p>Error loading transcript.</p>';
          return;
      }

      const srtData = this.parseSRT(srtContent);
      this.parsedSRT = this.preprocessSRT(srtData);

      console.log(this.parsedSRT);

      if (this.parsedSRT.length === 0) {
          this.transcriptElement.innerHTML = '<p>No highlighted words found in transcript.</p>';
          return;
      }

      // Initial render
      this.renderTranscript();

      // Bind event listeners
      this.audioElement.addEventListener('timeupdate', () => this.updateHighlight());
      this.bindTranscriptClick();
      this.bindKeyboardShortcuts();
  }

  /**
   * Fetches the SRT file content.
   * @param {string} path - The path to the SRT file.
   * @returns {Promise<string>} - The content of the SRT file.
   */
  async fetchSRT(path) {
      try {
          const response = await fetch(path);
          if (!response.ok) {
              throw new Error(`Failed to fetch SRT file: ${response.statusText}`);
          }
          return await response.text();
      } catch (error) {
          console.error(error);
          return '';
      }
  }

  /**
   * Converts SRT content to an array of subtitle objects.
   * @param {string} srt - The SRT file content.
   * @returns {Array} - Array of subtitle objects.
   */
  parseSRT(srt) {
      const blocks = srt.trim().split('\n\n');
      return blocks.map(block => {
          const lines = block.split('\n');
          if (lines.length >= 3) {
              const index = parseInt(lines[0], 10);
              const timeRange = lines[1];
              const textLines = lines.slice(2);
              const [start, end] = timeRange.split(' --> ');
              return {
                  index,
                  startTime: this.convertTimeToSeconds(start),
                  endTime: this.convertTimeToSeconds(end),
                  text: textLines.join(' ')
              };
          }
          return null;
      }).filter(block => block !== null);
  }

  /**
   * Converts a time string (hh:mm:ss,ms) to seconds.
   * @param {string} time - The time string.
   * @returns {number} - Time in seconds.
   */
  convertTimeToSeconds(time) {
      const [hours, minutes, seconds] = time.split(':');
      const [sec, ms] = seconds.split(',');
      return parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(sec, 10) + parseInt(ms, 10) / 1000;
  }

  /**
   * Extracts the highlighted word from the subtitle text.
   * @param {string} text - The subtitle text.
   * @returns {string} - The highlighted word without HTML tags.
   */
  extractHighlightedWord(text) {
      const regex = /<font color="#00ff00">(.*?)<\/font>/i;
      const match = regex.exec(text);
      return match ? match[1].trim() : '';
  }

  /**
   * Preprocesses the SRT data by extracting only the highlighted words.
   * @param {Array} srtData - The parsed SRT data.
   * @returns {Array} - Array of objects with startTime and word.
   */
  preprocessSRT(srtData) {
      return srtData
          .map(sub => {
              const word = this.extractHighlightedWord(sub.text);
              return word ? { startTime: sub.startTime, word } : null;
          })
          .filter(sub => sub !== null);
  }

  /**
   * Renders the transcript with clickable words.
   */
  renderTranscript() {
      this.transcriptElement.innerHTML = this.formatTranscript(this.parsedSRT, this.currentWordIndex);
  }

  /**
   * Formats the transcript by inserting paragraph breaks and wrapping words in spans.
   * @param {Array} words - Array of word objects with startTime and word.
   * @param {number} currentWordIndex - The index of the current word to highlight.
   * @returns {string} - HTML string of the formatted transcript.
   */
  formatTranscript(words, currentWordIndex) {
      return words.map((wordObj, index) => {
          const isCurrent = index === currentWordIndex;
          const spanClass = isCurrent ? 'current-word' : 'transcript-word';
          // Escape HTML entities in word to prevent XSS
          const escapedWord = this.escapeHTML(wordObj.word);
          // Wrap word in span with data-start-time
          const wordHTML = `<span class="${spanClass}" data-start-time="${wordObj.startTime}">${escapedWord}</span>`;
          return this.paragraphBreaks.has(index + 1) ? `</p><p>${wordHTML} ` : `${wordHTML} `;
      }).join('').trim().replace(/^/, '<p>').replace(/\s*$/, '</p>');
  }

  /**
   * Escapes HTML entities to prevent XSS attacks.
   * @param {string} str - The string to escape.
   * @returns {string} - Escaped string.
   */
  escapeHTML(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
  }

  /**
   * Finds the index of the closest word based on the current audio time.
   * @param {Array} words - Array of word objects with startTime and word.
   * @param {number} currentTime - The current time of the audio.
   * @returns {number} - The index of the closest word.
   */
  findClosestWordIndex(words, currentTime) {
      let closestIndex = -1;
      let smallestDifference = Infinity;

      for (let i = 0; i < words.length; i++) {
          const diff = Math.abs(words[i].startTime - currentTime);
          if (diff < smallestDifference) {
              smallestDifference = diff;
              closestIndex = i;
          }
      }

      return closestIndex;
  }

  /**
   * Updates the transcript highlighting based on the current audio time.
   */
  updateHighlight() {
      const currentTime = this.audioElement.currentTime;
      const closestWordIndex = this.findClosestWordIndex(this.parsedSRT, currentTime);
      if (closestWordIndex !== this.currentWordIndex) {
          this.currentWordIndex = closestWordIndex;
          this.renderTranscript();
          this.scrollToCurrentWord();
      }
  }

  /**
   * Scrolls the transcript to ensure the current word is visible.
   */
  scrollToCurrentWord() {
      const currentWordElement = this.transcriptElement.querySelector('.current-word');
      if (currentWordElement) {
          currentWordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }

  /**
   * Binds click events to the transcript words.
   * Clicking a word seeks to its start time without altering play/pause state.
   */
  bindTranscriptClick() {
      this.transcriptElement.addEventListener('click', (event) => {
          const target = event.target;
          if (target.classList.contains('transcript-word') || target.classList.contains('current-word')) {
              const startTime = parseFloat(target.getAttribute('data-start-time'));
              if (!isNaN(startTime)) {
                  const wasPlaying = !this.audioElement.paused;
                  this.audioElement.currentTime = startTime;
                  if (wasPlaying) {
                      this.audioElement.play();
                  }
                  // If audio was paused, do not play
              }
          }
      });
  }

  /**
   * Binds keyboard shortcuts for audio control.
   * - k: Pause
   * - j: Go back 5 seconds
   * - l: Go forward 5 seconds
   * - ,: Go back 1 second
   * - .: Go forward 1 second
   */
  bindKeyboardShortcuts() {
      document.addEventListener('keydown', (event) => {
          const key = event.key.toLowerCase();

          switch (key) {
              case 'k':
                  if (!this.audioElement.paused) {
                      this.audioElement.pause();
                  }
                  break;
              case 'j':
                  this.seekAudio(-5);
                  break;
              case 'l':
                  this.seekAudio(5);
                  break;
              case ',':
                  this.seekAudio(-1);
                  break;
              case '.':
                  this.seekAudio(1);
                  break;
              default:
                  // Do nothing for other keys
                  break;
          }
      });
  }

  /**
   * Seeks the audio by a specified number of seconds.
   * @param {number} seconds - The number of seconds to seek. Positive to forward, negative to backward.
   */
  seekAudio(seconds) {
      let newTime = this.audioElement.currentTime + seconds;
      // Clamp the new time between 0 and duration
      newTime = Math.max(0, Math.min(newTime, this.audioElement.duration));
      this.audioElement.currentTime = newTime;
  }
}

// Expose the class to the global scope
window.TranscriptHighlighter = TranscriptHighlighter;
