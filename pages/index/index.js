// index.js
// 获取应用实例
const app = getApp()

Page({
  data: {
    play: false
  },
  toPlay: function(event) {
    this.setData({
      play: true
    })
  },
  toPause: function(event) {
    this.setData({
      play: false
    })
  }
})
