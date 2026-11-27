import ExpoModulesCore

public class RemioTerminalModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RemioTerminal")

    View(RemioTerminalView.self) {
      Events("onCellMetrics")

      Prop("frame") { (view: RemioTerminalView, frame: TerminalFrameRecord) in view.setFrame(frame) }
      Prop("theme") { (view: RemioTerminalView, theme: TerminalThemeRecord) in view.setTheme(theme) }
      Prop("fontFamily") { (view: RemioTerminalView, family: String) in view.setFontFamily(family) }
      Prop("fontSize") { (view: RemioTerminalView, size: Double) in view.setFontSize(size) }
      Prop("customGlyphs") { (view: RemioTerminalView, glyphs: [TerminalCustomGlyphRecord]) in
        view.setCustomGlyphs(glyphs)
      }

      OnViewDidUpdateProps { (view: RemioTerminalView) in view.commit() }
    }
  }
}
