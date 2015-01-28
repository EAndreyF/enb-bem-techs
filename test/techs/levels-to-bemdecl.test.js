var vow = require('vow'),
    mockFs = require('mock-fs'),
    TestNode = require('enb/lib/test/mocks/test-node'),
    levelsTech = require('../../techs/levels'),
    levelsToBemdeclTech = require('../../techs/levels-to-bemdecl');

describe('techs', function () {
    describe('levels-to-bemdecl', function () {
        afterEach(function () {
            mockFs.restore();
        });

        it('must detect block', function (done) {
            var scheme = {
                    blocks: {
                        block: {
                            'block.ext': ''
                        }
                    }
                },
                bemdecl = [{ name: 'block' }];

            assert(scheme, bemdecl, done);
        });

        it('must detect boolean mod of block', function (done) {
            var scheme = {
                    blocks: {
                        block: {
                            '_bool-mod': {
                                'block_bool-mod.ext': ''
                            }
                        }
                    }
                },
                bemdecl = [
                    { name: 'block' },
                    { name: 'block', mods: [{ name: 'bool-mod', vals: [{ name: true }] }] }
                ];

            assert(scheme, bemdecl, done);
        });

        it('must detect mod of block', function (done) {
            var scheme = {
                    blocks: {
                        block: {
                            '_mod-name': {
                                'block_mod-name_mod-val.ext': ''
                            }
                        }
                    }
                },
                bemdecl = [
                    { name: 'block' },
                    { name: 'block', mods: [{ name: 'mod-name', vals: [{ name: 'mod-val' }] }] }
                ];

            assert(scheme, bemdecl, done);
        });

        it('must detect elem', function (done) {
            var scheme = {
                    blocks: {
                        block: {
                            '__elem-name': {
                                'block__elem-name.ext': ''
                            }
                        }
                    }
                },
                bemdecl = [
                    { name: 'block' },
                    { name: 'block', elems: [{ name: 'elem-name' }] }
                ];

            assert(scheme, bemdecl, done);
        });

        it('must detect boolean mod of elem', function (done) {
            var scheme = {
                    blocks: {
                        block: {
                            '__elem-name': {
                                '_bool-mod': {
                                    'block__elem-name_bool-mod.ext': ''
                                }
                            }
                        }
                    }
                },
                bemdecl = [
                    { name: 'block' },
                    { name: 'block', elems: [{ name: 'elem-name' }] },
                    { name: 'block', elems: [
                        { name: 'elem-name', mods: [{ name: 'bool-mod', vals: [{ name: true }] }] }
                    ] }
                ];

            assert(scheme, bemdecl, done);
        });

        it('must detect mod of elem', function (done) {
            var scheme = {
                    blocks: {
                        block: {
                            '__elem-name': {
                                '_mod-name': {
                                    'block__elem-name_mod-name_mod-val.ext': ''
                                }
                            }
                        }
                    }
                },
                bemdecl = [
                    { name: 'block' },
                    { name: 'block', elems: [{ name: 'elem-name' }] },
                    { name: 'block', elems: [{
                        name: 'elem-name',
                        mods: [{ name: 'mod-name', vals: [{ name: 'mod-val' }] }]
                    }] }
                ];

            assert(scheme, bemdecl, done);
        });
    });
});

function assert(fsScheme, expected, done) {
    var levels = Object.keys(fsScheme),
        dataBundle = new TestNode('data-bundle'),
        fsBundle;

    fsScheme['data-bundle'] = {};
    fsScheme['fs-bundle'] = {};

    mockFs(fsScheme);

    dataBundle = new TestNode('data-bundle');
    fsBundle = new TestNode('fs-bundle');

    fsBundle.runTech(levelsTech, { levels: levels })
        .then(function (levels) {
            fsBundle.provideTechData('?.levels', levels);
            dataBundle.provideTechData('?.levels', levels);

            return vow.all([
                fsBundle.runTechAndGetResults(levelsToBemdeclTech),
                fsBundle.runTechAndRequire(levelsToBemdeclTech),
                dataBundle.runTechAndGetResults(levelsToBemdeclTech),
                dataBundle.runTechAndRequire(levelsToBemdeclTech)
            ]);
        })
        .spread(function (data1, target1, data2, target2) {
            data1['fs-bundle.bemdecl.js'].blocks.must.eql(expected);
            target1[0].blocks.must.eql(expected);
            data2['data-bundle.bemdecl.js'].blocks.must.eql(expected);
            target2[0].blocks.must.eql(expected);
        })
        .then(done, done);
}
