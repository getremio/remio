process.on("message", (message) => {
  if (message?.type !== "remio_frame") return;
  process.send?.(message);
});
