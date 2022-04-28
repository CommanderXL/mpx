import VueCompositionAPI from '@vue/composition-api'
import { LIFECYCLES_HOOKS, mergeWebHook } from './shim'

function install(mpx) {
  if (__mpx_mode__ === 'web') {
    mpx.__vue.use(VueCompositionAPI)
  } else {
    // proxy 能力增强
    mpx.__proxy.mixin = function (mixins) {
      mpx.mixin(mixins)
    }
    mpx.__proxy.observable = function (...args) {
      return mpx.observable(...args)
    }

    // web -> 小程序 LifeCycle
    const mpxProxyConfig = {
      optionMergeStrategies: {}
    }
    LIFECYCLES_HOOKS.forEach((hook) => {
      mpxProxyConfig.optionMergeStrategies[hook] = mergeWebHook
    })
    mpx.__proxy.config = mpxProxyConfig

    const rawInstall = VueCompositionAPI.install
    VueCompositionAPI.install = function (proxy1, options, proxy2) {
      mpx.__proxy.version = '2.7.30'
      rawInstall(mpx.__proxy, options)
    }
    VueCompositionAPI.install(mpx)
  }
}

export default {
  install
}
