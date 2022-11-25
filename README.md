# AudioWavePlayer
一个带音频波形图的音乐播放器，基于微信小程序实现

| 属性           | 使用                                                         | 默认值                          |
| -------------- | ------------------------------------------------------------ | ------------------------------- |
| width          | 组件宽度,String类型,取值:100%/100rpx/100px                   | 100%                            |
| height         | 组件高度,String类型,取值:100%/100rpx/100px                   | 200rpx                          |
| normalize      | 波形幅度归一化,Boolean类型                                   | true                            |
| audio-url      | 音频url,String类型                                           |                                 |
| min-px-per-sec | 每秒代表多少个像素,Integer类型,单位为px                      | 20                              |
| bar-width      | 每一个波形的宽度,Integer类型,单位rpx                         | 4                               |
| wave-color     | 波形图颜色,String类型,取值:\#e0e0e0/rgba(240, 240, 240, 1)   | \#e0e0e0                        |
| progress-color | 进度条颜色,String类型,取值:\#ff0000/rgba(255, 0, 0, 1)       | \#ff0000                        |
| start-play     | 播放控制,Boolean类型,取值true/false,为true开始播放,为false暂停播放 | false                           |
| bind:loaded    | 音频加载完成回调                                             | event{duration: duration}       |
| bind:playing   | 播放中回调                                                   | event{currentTime: currentTime} |
| bind:drawed    | 波形图绘制完成回调                                           | event{}                         |
| bind:start     | 开始播放回调                                                 | event{}                         |
| bind:paused    | 暂停播放回调                                                 | event{}                         |
| bind:finish    | 播放完成回调                                                 | event{}                         |

```xml
<!--index.wxml-->
<view class="container">
  <wave-audio-player audio-url="https://m10.music.126.net/20221126015527/d4aec4c860e654458dab6bd73478adab/ymusic/0e51/fb4f/7b82/7fd4042d8b33f8fa6071ca8edc36563c.mp3" start-play="{{play}}"></wave-audio-player>
  <view style="height: 88rpx; background: #00f; line-height: 88rpx; text-align: center; color:white;margin-top: 20rpx;" bindtap="toPlay">play</view>
  <view style="height: 88rpx; background: #f00; line-height: 88rpx; text-align: center; color:white; margin-top: 20rpx;" bindtap="toPause">pause</view>
</view>
```

![audio_wave](./resource/audio_wave.gif)
