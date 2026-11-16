export const bHh = '624868746c'

export const headers = {
  'User-Agent': 'lx-music mobile request',
  [bHh]: [bHh],
}


// 为什么：出站请求默认超时统一收到 10s。原值 15s 只在 request.js 里写死、
// 音源侧无从覆盖；这里保留导出名不变（仍是 timeout），由 utils.request 读取为默认值。
export const timeout = 10000
