{pkgs}: {
  deps = [
    # Core dependencies
    pkgs.nodejs-20_x
    pkgs.nodejs
    pkgs.nodePackages.npm
    pkgs.postgresql_16
    
    # Development tools
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
    pkgs.nodePackages.prettier
    
    # Build tools
    pkgs.esbuild
    pkgs.vite
    
    # System utilities
    pkgs.jq
    pkgs.procps
    pkgs.lsof
    pkgs.wget
    pkgs.git
    
    # Database tools
    pkgs.postgresql
    pkgs.pgcli
    
    # Monitoring and debugging
    pkgs.htop
    pkgs.tree
    
    # SSL support
    pkgs.openssl
    
    # Compression
    pkgs.gzip
    pkgs.bzip2
  ];
  
  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.openssl
    ];
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true";
    PATH = "${pkgs.nodejs}/bin:${pkgs.nodePackages.npm}/bin:$PATH";
  };
}
