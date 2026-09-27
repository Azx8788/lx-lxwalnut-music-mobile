// 占位脚本（placeholder）
// 上游仓库未包含此补丁脚本（react-native-track-player 均衡器相关补丁），
// 为保证 npm install/ci 的 postinstall 流程可正常完成，此处提供占位实现。
// 如需恢复该补丁的能力，请将上游作者提供的真实脚本替换此文件。
console.log('[skip] apply-rntp-eq-patch.js: patch script is not available upstream')
