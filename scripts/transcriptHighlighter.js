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
      this.transcriptElement.innerHTML = this.formatTranscript(this.parsedSRT, -1);
  
      // Bind event listener
      this.audioElement.addEventListener('timeupdate', () => this.updateHighlight());
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
     * Formats the transcript by inserting paragraph breaks and wrapping words in spans.
     * @param {Array} words - Array of word objects with startTime and word.
     * @param {number} currentWordIndex - The index of the current word to highlight.
     * @returns {string} - HTML string of the formatted transcript.
     */
    formatTranscript(words, currentWordIndex) {
      return words.map((wordObj, index) => {
        const isCurrent = index === currentWordIndex;
        const wordHTML = isCurrent ? `<span class="current-word">${wordObj.word}</span>` : wordObj.word;
        return this.paragraphBreaks.has(index + 1) ? `</p><p>${wordHTML} ` : `${wordHTML} `;
      }).join('').trim().replace(/^/, '<p>').replace(/\s*$/, '</p>');
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
      this.transcriptElement.innerHTML = this.formatTranscript(this.parsedSRT, closestWordIndex);
    }
  }
  
  // Expose the class to the global scope
  window.TranscriptHighlighter = TranscriptHighlighter;
  