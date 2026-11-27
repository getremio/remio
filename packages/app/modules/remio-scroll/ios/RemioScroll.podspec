Pod::Spec.new do |s|
  s.name           = 'RemioScroll'
  s.version        = '0.1.0'
  s.summary        = 'Scroll view corrections for Remio'
  s.description    = 'Scroll view corrections for Remio'
  s.license        = 'Apache-2.0'
  s.author         = 'Remio'
  s.homepage       = 'https://remio.hoshizukimio.moe'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :path => '.' }
  s.static_framework = true

  s.source_files = "**/*.{h,mm}"

  install_modules_dependencies(s)
end
