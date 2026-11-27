package moe.hoshizukimio.remio.terminal

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RemioTerminalModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RemioTerminal")

    OnCreate { TerminalInputKeyboard.install() }

    View(RemioTerminalView::class) {
      Events("onCellMetrics")

      Prop("frame") { view: RemioTerminalView, frame: TerminalFrameRecord -> view.setFrame(frame) }
      Prop("theme") { view: RemioTerminalView, theme: TerminalThemeRecord -> view.setTheme(theme) }
      Prop("fontFamily") { view: RemioTerminalView, family: String -> view.setFontFamily(family) }
      Prop("fontSize") { view: RemioTerminalView, size: Double -> view.setFontSize(size) }
      Prop("customGlyphs") { view: RemioTerminalView, glyphs: List<TerminalCustomGlyphRecord> ->
        view.setCustomGlyphs(glyphs)
      }

      OnViewDidUpdateProps { view: RemioTerminalView -> view.commit() }
    }
  }
}
