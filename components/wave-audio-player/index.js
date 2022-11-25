// components/wave-audio-player/index.js
var timer
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    /**
     * 组件宽度,100%/100rpx/100px
     */
    width: {
      type: String,
      value: "100%"
    },
    /**
     * 组件高度,100%/100rpx/100px
     */
    height: {
      type: String,
      value: "200rpx"
    },
    /**
     * 是否归一化处理
     */
    normalize: {
      type: Boolean,
      value: true
    },
    /**
     * 音频url
     */
    audioUrl: {
      type: String,
      value: "",
      observer: function(newVal, oldVal) {
        if(newVal) {
          this.setData({
            audioUrl: newVal,
            startPlay: false
          })
          this.loadAudio()
        }
      }
    },
    /**
     * 每秒代表多少个像素
     */
    minPxPerSec: {
      type: Number,
      value: 20
    },
    /**
     * 每一个波形的宽度,单位rpx
     */
    barWidth: {
      type: Number,
      value: 4
    },
    /**
     * 波形图颜色,"#e0e0e0或者rgba(255, 0, 0, 1), 默认为#e0e0e0"
     */
    waveColor: {
      type: String,
      value: "#e0e0e0"
    },
    /**
     * 进度条颜色,"#ff0000或者rgba(255, 0, 0, 1), 默认为#ff0000"
     */
    progressColor: {
      type: String,
      value: "#ff0000"
    },
    /**
     * 控制开始播放和暂停播放,true:开始播放,false:暂停播放,默认false
     */
    startPlay: {
      type: Boolean,
      value: false,
      observer: function(newVal, oldVal) {
        if(newVal) {
          this.play()
        } else {
          this.pause()
        }
      }
    },
    /**
     * 是否自动播放
     */
    autoPlay: {
      type: Boolean,
      value: false,
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    state: "paused",
    audioContext: null,
    audioBuffer: null,
    audioSource: null,
    startPosition: 0,
    lastPlay: 0,
    peaks: [],
    absMaxOfPeaks: 0,
    waveContext: null,
    progressContext: null
  },

  lifetimes: {
    detached: function() {
      if(timer) {
        clearTimeout(timer)
      }
    }
  },

  pageLifetimes: {
    hide: function() {
      this.pause()
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 加载音频
     */
    loadAudio: function() {
      this.setData({
        audioBuffer: null
      })
      let audioContext = this.data.audioContext
      if(!audioContext) {
        audioContext = wx.createWebAudioContext()
      }
      wx.request({
        url: this.data.audioUrl,
        responseType: 'arraybuffer',
        success: (res) => {
          let audioData = res.data
          audioContext.decodeAudioData(audioData, (buffer) => {
            let duration = buffer ? buffer.duration:0
            this.setData({
              audioBuffer: buffer,
              audioContext: audioContext,
              lastPlay: audioContext.currentTime,
              startPosition: 0,
              state: "paused"
            })
            this.triggerEvent("loaded", {duration: duration})
            this.calcWaveWidth();
          }, (err) => {
            console.error('decodeAudioData fail', err)
          })
        },
        fail: (err) => {
          console.error('request fail', err)
        }
      })
    },

    /**
     * 当前已播放时间
     */
    getCurrentTime: function() {
      let audioContext = this.data.audioContext
      let startPosition = this.data.startPosition
      let lastPlay = this.data.lastPlay
      return startPosition + (audioContext.currentTime - lastPlay)
    },

    /**
     * 音频时长
     */
    getDuration: function() {
      let audioBuffer = this.data.audioBuffer
      return audioBuffer ? audioBuffer.duration:0
    },

    /**
     * 开始播放
     */
    play: function() {
      let state = this.data.state
      if(state == "playing") {
        return
      }
      let waveCanvas = this.data.waveCanvas
      if(!waveCanvas) {
        wx.showToast({
          title: '正在初始化,请稍后...',
        })
        return
      }
      let audioBuffer = this.data.audioBuffer
      let audioContext = this.data.audioContext
      if(!audioContext) {
        return
      }
      if(!audioBuffer) {
        return
      }
      if(audioContext.state == "suspended") {
        audioContext.resume()
      }
      let audioSource = this.data.audioSource
      if(audioSource) {
        audioSource.disconnect()
        audioSource.stop(0)
      }
      audioSource = audioContext.createBufferSource()
      audioSource.buffer = audioBuffer
      audioSource.connect(audioContext.destination)

      audioSource.onended = () => {
        let startPosition = this.data.startPosition + (audioContext.currentTime - this.data.lastPlay)
        if(startPosition > audioBuffer.duration) {
          startPosition = 0
          this.setData({
            startPosition: startPosition,
            lastPlay: audioContext.currentTime,
            state: "finish",
            startPlay: false
          })
          this.triggerEvent("finish", {})
        } else {
          this.setData({
            state: "paused",
            startPosition: startPosition,
            startPlay: false
          })
          this.triggerEvent("paused", {})
        }
      }
      this.pollingState()
      audioSource.start(0, this.data.startPosition)
      let lastPlay = audioContext.currentTime
      this.setData({
        audioSource: audioSource,
        lastPlay: lastPlay,
        state: "playing"
      })
      this.triggerEvent("start", {})
    },

    /**
     * 停止播放
     */
    pause: function() {
      let audioSource = this.data.audioSource
      if(!audioSource) {
        return
      }
      audioSource.disconnect()
      audioSource.stop(0)

      let waveCanvas = this.data.waveCanvas
      if(timer && waveCanvas) {
        // clearTimeout(timer)
        waveCanvas.cancelAnimationFrame(timer)
      }
    },

    /**
     * 轮询获取播放时长以及播放进度
     */
    pollingState: function() {
      // if(timer) {
      //   clearTimeout(timer)
      // }
      // timer = setTimeout(() => {
      //   clearTimeout(timer)
      //   let state = this.data.state
      //   if(state == "playing") {
      //     let currentTime = this.getCurrentTime()
      //     let duration = this.getDuration()
      //     let percent = Math.min(currentTime/duration, 1)

      //     this.drawWave(percent)

      //     this.triggerEvent("playing", {
      //       currentTime: currentTime,
      //       percent: percent
      //     })
      //   }
      //   this.pollingState()
      // }, 50)

      let waveCanvas = this.data.waveCanvas
      if(timer) {
        waveCanvas.cancelAnimationFrame(timer)
      }
      timer = waveCanvas.requestAnimationFrame(() => {
        waveCanvas.cancelAnimationFrame(timer)

        let state = this.data.state
        if(state == "playing") {
          let currentTime = this.getCurrentTime()
          let duration = this.getDuration()
          let percent = Math.min(currentTime/duration, 1)

          this.drawWave(percent)

          this.triggerEvent("playing", {
            currentTime: currentTime,
            percent: percent
          })
        }

        this.pollingState()
      })
    },

    /**
     * 确定播放器宽高,计算波形宽度,生成波形数据,并计算峰值
     */
    calcWaveWidth: function() {
      const query = this.createSelectorQuery()
      query.select('#wave').boundingClientRect()
      query.exec((res) => {
        /**
         * 确定播放器宽高
         */
        let playerWidth = res && res[0] ? res[0].width:0
        let playerHeight = res && res[0] ? res[0].height:0
  
        if(!playerWidth) {
          return
        }
        this.setData({
          playerWidth: playerWidth,
          playerHeight: playerHeight
        })
  
        /**
         * 确定波形宽度
         */
        let minPxPerSec = this.data.minPxPerSec
        let duration = this.getDuration()
        let nominalWidth = Math.round(duration * minPxPerSec);
        let width = nominalWidth; 
        let start = 0;
        let end = Math.max(start + playerWidth, width);
        if(nominalWidth < playerWidth) {
          width = playerWidth;
          start = 0;
          end = width;
        }
        this.setData({
          waveWidth: width
        })

        /**
         * 生成波形数据，并计算峰值
         */
        let peaks = this.getPeaks()
        let absMaxOfPeaks = this.absMax(peaks)
        this.setData({
          peaks: peaks, 
          absMaxOfPeaks: absMaxOfPeaks
        })

        /**
         * 确定canvas宽高
         */
        this.initCanvas()
      })
    },

    /**
     * 获取声音频谱数据
     */
    getPeaks: function(splitChannels = false) {
      let audioBuffer = this.data.audioBuffer
      let waveWidth = this.data.waveWidth
      let length = waveWidth
      let first = 0
      let last = length - 1

      //setLength
      let splitPeaks = []
      let channels = audioBuffer ? audioBuffer.numberOfChannels : 1
      let c
      for (c = 0; c < channels; c++) {
        splitPeaks[c] = []
        splitPeaks[c][2 * (length - 1)] = 0
        splitPeaks[c][2 * (length - 1) + 1] = 0
      }
      let mergedPeaks = []
      mergedPeaks[2 * (length - 1)] = 0;
      mergedPeaks[2 * (length - 1) + 1] = 0;

      if (!audioBuffer || !audioBuffer.length) {
        return splitChannels ? splitPeaks:mergedPeaks;
      }

      let sampleSize = audioBuffer.length / length;
      let sampleStep = ~~(sampleSize / 10) || 1;
      
      for (c = 0; c < channels; c++) {
        let peaks = splitPeaks[c];
        let chan = audioBuffer.getChannelData(c);
        let i = void 0;

        for (i = first; i <= last; i++) {
          let start = ~~(i * sampleSize);
          let end = ~~(start + sampleSize);

          let min = chan[start];
          let max = min;
          let j = void 0;

          for (j = start; j < end; j += sampleStep) {
            let value = chan[j];

            if (value > max) {
              max = value;
            }

            if (value < min) {
              min = value;
            }
          }

          peaks[2 * i] = max;
          peaks[2 * i + 1] = min;

          if (c == 0 || max > mergedPeaks[2 * i]) {
            mergedPeaks[2 * i] = max;
          }

          if (c == 0 || min < mergedPeaks[2 * i + 1]) {
            mergedPeaks[2 * i + 1] = min;
          }
        }
      }
      
      let result = splitChannels ? splitPeaks:mergedPeaks;
      return result;
    },

    absMax: function(array) {
      let newArray = array.filter(function(item) {
        return item != undefined;
      })
      let max = Math.max(...newArray)
      let min = Math.min(...newArray)
      return -min > max ? -min : max;
    },

    /**
     * 确定画布宽高
     */
    initCanvas: function() {
      const query = this.createSelectorQuery()
      query.select('#wave-canvas').fields({ node: true, size: true })
      query.select('#progress-canvas').fields({ node: true, size: true })
      query.exec((res) => {
        const dpr = wx.getSystemInfoSync().pixelRatio

        const waveCanvas = res[0].node
        const waveContext = waveCanvas.getContext('2d')
        waveCanvas.width = res[0].width * dpr
        waveCanvas.height = res[0].height * dpr
        waveContext.scale(dpr, dpr)

        const progressCanvas = res[1].node
        const progressContext = progressCanvas.getContext('2d')
        progressCanvas.width = res[1].width * dpr
        progressCanvas.height = res[1].height * dpr
        progressContext.scale(dpr, dpr)

        this.setData({
          waveCanvas: waveCanvas,
          waveContext: waveContext,
          progressContext: progressContext
        })

        this.drawWave()
        if(this.data.autoPlay) {
          let startPlay = this.data.startPlay
          if(startPlay) {
            this.play()
          } else {
            this.setData({
              startPlay: true
            })
          }
        }
      })
    },

    /**
     * 绘制波形和进度
     */
    drawWave: function(percent = 0) {
      let peaks = this.data.peaks
      let absMaxOfPeaks = this.data.absMaxOfPeaks
      let waveWidth = this.data.waveWidth

      if (peaks[0] instanceof Array) {
        let channels = peaks;
        peaks = channels[0];
      }
      let normalize = this.data.normalize
      let absmax = 1;
      if(normalize) {
        absmax = absMaxOfPeaks;
      }
      let hasMinVals = [].some.call(peaks, function (val) {
        return val < 0;
      });
      let height = this.data.playerHeight;
      let halfH = height / 2;
      let offsetY = 0;

      let peakIndexScale = hasMinVals ? 2 : 1;
      let length = peaks.length / peakIndexScale;
      let barWidth = this.data.barWidth
      let bar = barWidth;
      let gap = Math.max(1, ~~(bar / 2))
      let step = bar + gap;
      let scale = length / waveWidth;
      let first = 0;
      let last = waveWidth;
      let i = first;
      let halfPixel = 0.5

      //计算偏移量
      let playerWidth = this.data.playerWidth
      let target = 0;

      let pos = ~~(waveWidth * percent);
      let halfW = ~~(playerWidth / 2);
      let maxScroll = waveWidth - playerWidth;
      if(maxScroll != 0) {
        target = Math.max(0, Math.min(maxScroll, pos - halfW));
      }

      this.clearCanvas()
      for (i; i < last; i += step) {
        var peak = peaks[Math.floor(i * scale * peakIndexScale)] || 0;
        var h = Math.round(peak / absmax * halfH);
        this.fillRect(i + halfPixel - target, halfH - h + offsetY, bar + halfPixel, h * 2)
        if(i + halfPixel < waveWidth*percent) {
          this.fillProgressRect(i + halfPixel - target, halfH - h + offsetY, bar + halfPixel, h * 2)
        }
      }
      this.triggerEvent("drawed", {})
    },

    clearCanvas: function() {
      let playerWidth = this.data.playerWidth
      let playerHeight = this.data.playerHeight
      let waveContext = this.data.waveContext
      let progressContext = this.data.progressContext
      waveContext.clearRect(0, 0, playerWidth, playerHeight)
      progressContext.clearRect(0, 0, playerWidth, playerHeight)
    },

    fillRect: function(x, y, width, height) {
      let playerWidth = this.data.playerWidth
      let waveColor = this.data.waveColor
      let intersection = {
        x1: x,
        y1: y,
        x2: Math.min(x + width, playerWidth),
        y2: y + height
      };
      let waveContext = this.data.waveContext
      waveContext.fillStyle = waveColor
      waveContext.fillRect(intersection.x1, intersection.y1, intersection.x2 - intersection.x1, (intersection.y2 - intersection.y1) == 0 ? 1:intersection.y2 - intersection.y1)
    },

    fillProgressRect: function(x, y, width, height) {
      let playerWidth = this.data.playerWidth
      let progressColor = this.data.progressColor
      let intersection = {
        x1: x,
        y1: y,
        x2: Math.min(x + width, playerWidth),
        y2: y + height
      };
      let progressContext = this.data.progressContext
      progressContext.fillStyle = progressColor
      progressContext.fillRect(intersection.x1, intersection.y1, intersection.x2 - intersection.x1, (intersection.y2 - intersection.y1) == 0 ? 1:intersection.y2 - intersection.y1)
    }
  },
})
