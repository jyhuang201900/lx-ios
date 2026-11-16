import apiSourceInfo from './api-source-info'

// import temp_api_kw from './kw/api-temp'
// import test_api_kg from './kg/api-test'
// import test_api_kw from './kw/api-test'
// import test_api_tx from './tx/api-test'
// import test_api_wy from './wy/api-test'
// import test_api_mg from './mg/api-test'

// import direct_api_kg from './kg/api-direct'
// import direct_api_kw from './kw/api-direct'
// import direct_api_tx from './tx/api-direct'
// import direct_api_wy from './wy/api-direct'
// import direct_api_mg from './mg/api-direct'

import settingState from '@/store/setting/state'
import { REQUEST_ERROR_CODES, RequestError } from './utils'


const apiList = {
  // temp_api_kw,
  // // test_api_bd: require('./bd/api-test'),
  // test_api_kg,
  // test_api_kw,
  // test_api_tx,
  // test_api_wy,
  // test_api_mg,
  // direct_api_kg,
  // direct_api_kw,
  // direct_api_tx,
  // direct_api_wy,
  // direct_api_mg,
  // test_api_tx: require('./tx/api-test'),
  // test_api_wy: require('./wy/api-test'),
  // test_api_xm: require('./xm/api-test'),
}
const supportQuality = {}

for (const api of apiSourceInfo) {
  supportQuality[api.id] = api.supportQualitys
  // for (const source of Object.keys(api.supportQualitys)) {
  //   const path = `./${source}/api-${api.id}`
  //   console.log(path)
  //   apiList[`${api.id}_api_${source}`] = path
  // }
}

const getAPI = source => apiList[`${settingState.setting['common.apiSource']}_api_${source}`]

const apis = source => {
  if (/^user_api/.test(settingState.setting['common.apiSource'])) return global.lx.apis[source]
  const api = getAPI(source)
  if (api) return api
  // 为什么：这里抛的不是网络错误，但形状与请求层一致（code/message/source），
  // 上层只需判 err.code，不必为「音源未配置」单独写一条分支
  throw new RequestError({
    code: REQUEST_ERROR_CODES.NO_API,
    message: 'Api is not found',
    source,
  })
}

export { apis, supportQuality }
