import ExpoModulesCore
import UIKit

public class RemioPressFeedbackModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RemioPressFeedback")
    View(RemioPressFeedbackView.self) {
      Prop("tint") { (view: RemioPressFeedbackView, color: UIColor) in view.tint = color }
      Prop("radius") { (view: RemioPressFeedbackView, radius: Double) in view.radius = radius }
      Prop("resetKey") { (view: RemioPressFeedbackView, key: String) in view.reset(key) }
      AsyncFunction("acknowledge") { (view: RemioPressFeedbackView) in view.acknowledge() }
    }
  }
}

final class RemioPressFeedbackView: ExpoView {
  var tint = UIColor.clear
  var radius: Double = 0
  private var acknowledged = false
  private var resetKey = ""
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isOpaque = false
    isUserInteractionEnabled = false
  }
  func acknowledge() { acknowledged = true; setNeedsDisplay() }
  func reset(_ key: String) {
    if key != resetKey { resetKey = key; acknowledged = false; setNeedsDisplay() }
  }
  override func draw(_ rect: CGRect) {
    if acknowledged { tint.setFill(); UIBezierPath(roundedRect: bounds, cornerRadius: radius).fill() }
  }
}
