# 音源清单与下线记录

`src/utils/musicSdk/` 下每个子目录是一个音源，在 `src/utils/musicSdk/index.js` 的 `sources` 里注册后才对用户可见。
本文档记录**哪些源在跑、哪些源死了、死后留了什么证据**——音源是别人家的服务，随时会关，所以死因必须留档，
否则半年后有人会把同一份死代码再翻出来重打一遍。

## 1. 当前注册的音源

| id | 名称 | 目录 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `kw` | 酷我音乐 | `src/utils/musicSdk/kw/` | 在用 | |
| `kg` | 酷狗音乐 | `src/utils/musicSdk/kg/` | 在用 | |
| `tx` | QQ音乐 | `src/utils/musicSdk/tx/` | 在用 | |
| `wy` | 网易音乐 | `src/utils/musicSdk/wy/` | 在用 | |
| `mg` | 咪咕音乐 | `src/utils/musicSdk/mg/` | 在用 | |
| `xm` | 小狗音乐 | `src/utils/musicSdk/xm.js` | 在用 | 单文件源，`searchMusic` 里被 `excludeSource` 排除，只走 `findMusic` |
| ~~`bd`~~ | ~~百度音乐~~ | ~~`src/utils/musicSdk/bd/`~~ | **已移除 2026-11-17** | 见第 2 节 |

注册三处（`src/utils/musicSdk/index.js`）：顶部 `import`、`sources.sources` 数组项、`sources` 对象里的展开值。
三处必须同时存在，只加一处不生效，只删一处会留下悬空 import——bd 之前就是三处全注释、目录还留着，成了 `graphify` 图里的噪音节点。

## 2. 百度音乐（bd）已下线

**结论：百度音乐公开 API 全部关停，bd 源整目录删除，不做迁移。**

- 移除日期：2026-11-17
- 删除范围：`src/utils/musicSdk/bd/`（6 文件 16843 字节）+ `src/utils/musicSdk/index.js` 里三处注释残留
- 判定依据：下表探测，2026-11-17 09:44（Asia/Shanghai）本机实测

### 探测证据

| 用途 | 接口 | 结果 | 判定 |
| --- | --- | --- | --- |
| 搜索 | `http://tingapi.ting.baidu.com/v1/restserver/ting?method=baidu.ting.search.merge&…` | HTTP **500**，`size_download=0B` | 不可用（网关在、接口废） |
| 搜索（换 method） | 同域 `baidu.ting.search.catalogSug` / `baidu.ting.search.common` / 带 `version=2.0.2` + Referer | 三个变体全部 **500 / 0B** | 不可用 |
| 歌曲链接 | `https://musicapi.qianqian.com/v1/restserver/ting?method=baidu.ting.song.getSongLink&…` | `curl: (6) Could not resolve host`，`8.8.8.8` 亦返回 **Non-existent domain** | 不可用（域名注销） |
| 热搜 | `http://musicapi.qianqian.com/v1/restserver/ting?method=baidu.ting.search.hot` | 同上，**NXDOMAIN** | 不可用 |
| 歌单标签 | `http://musicmini.qianqian.com/v1/restserver/ting?method=baidu.ting.ugcdiy.getChannels` | **302** → `http://c.taihe.com/res/download_pcclient/index.html` → **403 ACCESS DENIED** | 不可用（导流到客户端下载页） |
| 榜单静态页 | `http://musicmini.qianqian.com/2018/static/bangdan/bangdanList_bdrgb_1.html` | **302** → 同上 → **403** | 不可用 |
| 歌曲详情页 | `http://music.taihe.com/song/243706508` | HTTP **200**，31KB HTML，正文为「**没有找到相关歌曲**」，只剩 `__NUXT__` 站壳 | 不可用（页面壳在、数据没了） |
| 域名根 | `http://music.baidu.com/` | **200**，但最终 URL 已跳到 `http://music.91q.com/` | 不可用（品牌已并入千千/91q） |
| 域名根 | `http://ting.baidu.com/` | **503 Service Unavailable** | 不可用 |

DNS 记录（2026-11-17）：

| 域名 | 解析 |
| --- | --- |
| `tingapi.ting.baidu.com` | 36.110.219.71 |
| `musicmini.qianqian.com` | 120.53.129.128 |
| `music.taihe.com` | 120.53.129.96 |
| `music.baidu.com` | 120.53.205.35 |
| `musicapi.qianqian.com` | **无记录（NXDOMAIN）** |

**为什么不是"本机被墙"**：`tingapi` 与 `musicmini` 都有正常解析、能回 500/302，`music.baidu.com` 能 200 跳转——
说明链路是通的，死的是接口本身；唯一解析失败的是 `musicapi.qianqian.com`，公网 DNS 也没有这条记录，是域名层面注销。

### 复检方法

半年后想确认它是不是复活了，跑这一条就够（任一返回 `error_code: 22000` 或含 `song_list` 才算复活）：

```bash
curl -sS -L --max-time 10 \
  'http://tingapi.ting.baidu.com/v1/restserver/ting?method=baidu.ting.search.merge&format=json&query=%E6%99%B4%E5%A4%A9&page_no=1&page_size=3&type=0'
```

复活的前提是**同时**满足：`tingapi` 不再 500、`musicapi.qianqian.com` 能解析、返回体里 `error_code=22000`。
只满足一条不算——榜单静态页那种"302 到下载页"的活法是导流，不是接口。

### 若将来要恢复 bd

1. 从 git 历史取回：`git log --diff-filter=D -- 'src/utils/musicSdk/bd/*'`，或 `git show <删除提交前的 sha>:src/utils/musicSdk/bd/index.js`。
2. 六个文件里所有 `httpFetch(...)` 换成统一请求层 `request(url, opts, { source: 'bd' })`；
   原来不判状态码、只靠 `error_code` 分支的地方传 `expectOk: false`（否则 4xx/5xx 会先被请求层抛掉，拿不到 body）。
3. 用 `py -3 shots-gh/check-request.py bd` 验证到 `clean`，再在 `index.js` 三处恢复注册。
4. 改完补一条真机播放验证：搜索能出列表 ≠ 能播，`getMusicUrl` 走的 `apis('bd')` 还得有可用实现（`api-source.js` 里 bd 的定义当年也一并注释了）。

## 3. 新增音源的注册清单

1. `src/utils/musicSdk/<id>/` 放实现（`index.js` 默认导出含 `musicSearch` / `songList` / `leaderboard` / `hotSearch` / `getMusicUrl` 等）。
2. `src/utils/musicSdk/index.js` 顶部 `import <id> from './<id>'`。
3. `sources.sources` 加 `{ name: '<中文名>', id: '<id>' }`，`sources` 对象加 `<id>,`。
4. `py -3 shots-gh/check-request.py <id>` 必须是 `clean`（无 `httpFetch` 残留、`request()` 带 `source`）。