{
  description = "Development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/bc8f8d1be58e8c8383e683a06e1e1e57893fff87";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        pythonEnv = pkgs.python3.withPackages (ps: with ps; [
          virtualenv
          pip
        ]);

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Python and core tools
            pythonEnv
            gcc

            # Deno
            deno

            # System libraries
            zlib
            stdenv.cc.cc.lib
          ];

          shellHook = ''
            # Create and activate Python venv if it doesn't exist
            if [ ! -d .venv ]; then
              ${pythonEnv}/bin/python -m venv --copies .venv
            fi
            source .venv/bin/activate

            # Install Python dependencies if requirements.txt exists
            if [ -f mkdocs/requirements.txt ]; then
              pip install -r mkdocs/requirements.txt
            fi

            # Install Deno dependencies
            deno install --entrypoint main.ts

            # Set up environment variables
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [
              pkgs.zlib
              pkgs.stdenv.cc.cc.lib
            ]}"
            cd mkdocs
            mkdocs build
            cd ..
            deno run --allow-all --watch ./main.ts
          '';
        };
      });
}
