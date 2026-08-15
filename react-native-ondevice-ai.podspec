Pod::Spec.new do |s|
  s.name         = 'react-native-ondevice-ai'
  s.version      = '1.0.1'
  s.summary      = 'React Native on-device AI model management and inference.'
  s.description  = 'Cross-platform model lifecycle and multimodal Gemma LiteRT-LM inference APIs.'
  s.homepage     = 'https://github.com/TechCraft-By-Subrata/react-native-ondevice-ai'
  s.license      = { :type => 'MIT' }
  s.author       = { 'TCBS' => 'support@tcbs.app' }
  s.source       = { :git => 'https://github.com/TechCraft-By-Subrata/react-native-ondevice-ai.git', :tag => s.version.to_s }
  s.platforms    = { :ios => '15.0' }
  s.source_files = [
    'ios/TcbsGemmaModule.m',
    'ios/TcbsGemmaModule.swift',
    'ios/LiteRTLM/*.swift',
  ]
  s.vendored_frameworks = 'ios/vendor/CLiteRTLM.xcframework'
  s.dependency 'React-Core'
  s.swift_version = '5.0'
end
