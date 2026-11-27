Pod::Spec.new do |s|
  s.name           = 'RemioPressFeedback'
  s.version        = '0.1.0'
  s.summary        = 'Native accepted press feedback for Remio'
  s.description    = 'Paints accepted press feedback independently of React commits'
  s.license        = 'Apache-2.0'
  s.author         = 'Remio'
  s.homepage       = 'https://remio.hoshizukimio.moe'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
