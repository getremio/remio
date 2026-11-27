{
  description = "Remio - self-hosted daemon for AI coding agents";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    {
      self,
      nixpkgs,
    }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
      pkgsFor = system: import nixpkgs { inherit system; };
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          remio = pkgs.callPackage ./nix/package.nix { };
          versionParts = pkgs.lib.splitString "." remio.version;
          sourceRevision = if self ? revCount && self.revCount != null then self.revCount else 0;
          buildRevision = sourceRevision - (sourceRevision / 10000) * 10000;
          desktopBuildVersion = pkgs.lib.concatStringsSep "." [
            (builtins.elemAt versionParts 0)
            (builtins.elemAt versionParts 1)
            (toString buildRevision)
          ];
        in
        {
          default = remio;
          remio = remio;
          desktop = pkgs.callPackage ./nix/desktop-package.nix {
            inherit remio;
            buildVersion = desktopBuildVersion;
          };
        }
      );

      checks = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          packages = self.packages.${system};
          license = (builtins.fromJSON (builtins.readFile ./package.json)).license;
        in
        {
          license-metadata =
            assert packages.remio.meta.license.spdxId == license;
            assert packages.desktop.meta.license.spdxId == license;
            pkgs.runCommand "remio-license-metadata" { } "touch $out";
        }
      );

      nixosModules.default = self.nixosModules.remio;
      nixosModules.remio =
        { pkgs, lib, ... }:
        {
          imports = [ ./nix/module.nix ];
          services.remio.package = lib.mkDefault self.packages.${pkgs.stdenv.hostPlatform.system}.default;
        };

      devShells = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_22
              pkgs.python3
            ];
          };
        }
      );
    };
}
