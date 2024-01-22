const pluginutils = require('@rollup/pluginutils')
const config = require('@unocss/config')
const core = require('@unocss/core')
const node_path = require('node:path')
const MagicString = require('magic-string')
const remapping = require('@ampproject/remapping')

const INCLUDE_COMMENT = '@unocss-include'
const IGNORE_COMMENT = '@unocss-ignore'
const CSS_PLACEHOLDER = '@unocss-placeholder'

const defaultExclude = [core.cssIdRE]
const defaultInclude = [/\.(vue|mpx|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/]

function createContext (configOrPath, defaults = {}, extraConfigSources = []) {
  const root = process.cwd()
  let rawConfig = {}
  const uno = core.createGenerator(rawConfig, defaults)
  let rollupFilter = pluginutils.createFilter(defaultInclude, defaultExclude)
  const ready = reloadConfig()

  async function reloadConfig () {
    const result = await config.loadConfig(root, configOrPath, extraConfigSources, defaults)
    rawConfig = result.config
    uno.setConfig(rawConfig)
    rollupFilter = pluginutils.createFilter(
      rawConfig.include || defaultInclude,
      rawConfig.exclude || defaultExclude
    )
    const presets = /* @__PURE__ */ new Set()
    uno.config.presets.forEach((i) => {
      if (!i.name) {
        return
      }
      if (presets.has(i.name)) {
        console.warn(`[unocss] duplication of preset ${i.name} found, there might be something wrong with your config.`)
      } else {
        presets.add(i.name)
      }
    })
    const nonPreTransformers = uno.config.transformers?.filter((i) => i.enforce !== 'pre')
    if (nonPreTransformers?.length) {
      console.warn(
        '[unocss] webpack integration only supports "pre" enforce transformers currently.the following transformers will be ignored\n' + nonPreTransformers.map((i) => ` - ${i.name}`).join('\n')
      )
    }
    return result
  }

  async function extract (code, id) {
    const tokens = new Set()
    await uno.applyExtractors(code, id, tokens)
    if (tokens.size > 0) {
      this.emitFile(id, '', undefined, {
        skipEmit: true,
        unocssTokens: tokens
      })
    }
  }

  function filter (code, id) {
    if (code.includes(IGNORE_COMMENT)) {
      return false
    }
    return code.includes(INCLUDE_COMMENT) || code.includes(CSS_PLACEHOLDER) || rollupFilter(id.replace(/\?v=\w+$/, ''))
  }

  return {
    get ready () {
      return ready
    },
    filter,
    uno,
    extract,
    transformCache: new Map()
  }
}

async function applyTransformers (ctx, original, id) {
  if (original.includes(IGNORE_COMMENT)) {
    return
  }
  const transformers = ctx.uno.config.transformers
  let code = original
  const maps = []
  for (const t of transformers) {
    // transformerVariantGroup会调用s.overwrite影响transformerDirectives执行，所以每次重新赋值。
    const s = new MagicString(code)
    if (t.idFilter) {
      if (!t.idFilter(id)) {
        continue
      }
    } else if (!ctx.filter(code, id)) {
      continue
    }
    await t.transform(s, id, ctx)
    if (s.hasChanged()) {
      code = s.toString()
      maps.push(s.generateMap({ hires: true, source: id }))
    }
  }
  if (code !== original) {
    return {
      code,
      map: remapping(maps, () => null)
    }
  }
}

function normalizeAbsolutePath (path) {
  if (node_path.isAbsolute(path)) {
    return node_path.normalize(path)
  } else {
    return path
  }
}

function getPath (id) {
  return id.replace(/\?.*$/, '')
}

function isCssId (id) {
  return core.cssIdRE.test(id)
}

module.exports = {
  createContext,
  applyTransformers,
  getPath,
  isCssId,
  normalizeAbsolutePath
}
