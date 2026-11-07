import os,urllib.request
L=[["three.min.js", "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"], ["CopyShader.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"], ["LuminosityHighPassShader.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"], ["EffectComposer.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"], ["MaskPass.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/MaskPass.js"], ["ShaderPass.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"], ["RenderPass.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"], ["UnrealBloomPass.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"]]
os.makedirs("libs",exist_ok=True)
for f,u in L:
    print("downloading",f);urllib.request.urlretrieve(u,os.path.join("libs",f))
print("done. open index.html")
