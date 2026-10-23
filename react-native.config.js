// Autolinking: the Android package; iOS finds the podspec and the component through codegenConfig.
module.exports = {
    dependency: {
        platforms: {
            android: {
                packageImportPath: 'import com.lordicon.reactnative.LordIconPackage;',
                packageInstance: 'new LordIconPackage()',
            },
        },
    },
};
