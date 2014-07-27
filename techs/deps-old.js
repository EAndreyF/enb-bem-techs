/**
 * deps-old
 * ========
 *
 * Собирает *deps.js*-файл на основе *levels* и *bemdecl*, раскрывая зависимости.
 * Сохраняет в виде `?.deps.js`. Использует алгоритм, заимствованный из bem-tools.
 *
 * **Опции**
 *
 * * *String* **bemdeclFile** — Исходный bemdecl. По умолчанию — `?.bemdecl.js`.
 * * *String* **levelsTarget** — Исходный levels. По умолчанию — `?.levels`.
 * * *String* **target** — Результирующий deps. По умолчанию — `?.deps.js`.
 *
 * **Пример**
 *
 * Обычное использование:
 * ```javascript
 * nodeConfig.addTech(require('enb-bem/techs/deps-old'));
 * ```
 *
 * Сборка специфического deps:
 * ```javascript
 * nodeConfig.addTech([require('enb-bem/techs/deps-old'), {
 *     bemdeclFile: 'search.bemdecl.js',
 *     target: 'search.deps.js'
 * }]);
 * ```
 */
var inherit = require('inherit');
var vow = require('vow');
var vfs = require('enb/lib/fs/async-fs');
var asyncRequire = require('enb/lib/fs/async-require');
var dropRequireCache = require('enb/lib/fs/drop-require-cache');
var OldDeps = require('../exlib/deps-old').OldDeps;

module.exports = inherit(require('enb/lib/tech/base-tech'), {

    getName: function () {
        return 'deps-old';
    },

    configure: function () {
        this._target = this.getOption('depsTarget');
        if (!this._target) {
            this._target = this.getOption('target', this.node.getTargetName('deps.js'));
        }
        this._target = this.node.unmaskTargetName(this._target);

        this._sourceDepsFile = this.getOption('bemdeclTarget');
        if (!this._sourceDepsFile) {
            this._sourceDepsFile = this.getOption('sourceDepsFile', this.node.getTargetName('bemdecl.js'));
        }
        this._sourceDepsFile = this.node.unmaskTargetName(this._sourceDepsFile);

        this._levelsTarget = this.node.unmaskTargetName(
            this.getOption('levelsTarget', this.node.getTargetName('levels')));
    },

    getTargets: function () {
        return [this._target];
    },

    build: function () {
        var node = this.node;
        var target = this._target;
        var targetFilename = node.resolvePath(target);
        var cache = node.getNodeCache(target);
        var sourceDepsFilename = this.node.resolvePath(this._sourceDepsFile);

        return this.node.requireSources([this._levelsTarget, this._sourceDepsFile])
            .spread(function (levels, sourceDeps) {
                var depFiles = levels.getFilesBySuffix('deps.js').concat(levels.getFilesBySuffix('deps.yaml'));

                if (cache.needRebuildFile('deps-file', targetFilename) ||
                    cache.needRebuildFile('source-deps-file', sourceDepsFilename) ||
                    cache.needRebuildFileList('deps-file-list', depFiles)
                ) {
                    return requireSourceDeps(sourceDeps, sourceDepsFilename)
                        .then(function (sourceDeps) {
                            return (new OldDeps(sourceDeps).expandByFS({ levels: levels }))
                                .then(function (resolvedDeps) {
                                    var resultDeps = resolvedDeps.getDeps();
                                    var str = 'exports.deps = ' + JSON.stringify(resultDeps, null, 4) + ';\n';

                                    return vfs.write(targetFilename, str, 'utf8')
                                        .then(function () {
                                            cache.cacheFileInfo('deps-file', targetFilename);
                                            cache.cacheFileInfo('source-deps-file', sourceDepsFilename);
                                            cache.cacheFileList('deps-file-list', depFiles);
                                            node.resolveTarget(target, resultDeps);
                                        });
                                });
                        });
                } else {
                    node.isValidTarget(target);
                    dropRequireCache(require, targetFilename);

                    return asyncRequire(targetFilename)
                        .then(function (result) {
                            node.resolveTarget(target, result.deps);
                            return null;
                        });
                }
            });
    }
});

function requireSourceDeps(data, filename) {
    if (data) {
        return vow.resolve(data);
    }

    dropRequireCache(require, filename);

    return asyncRequire(filename)
        .then(function (result) {
            return result.blocks;
        });
}
