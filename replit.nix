{pkgs}: {
  deps = [
    pkgs.zip
    pkgs.procps
    pkgs.nodePackages.prettier
    pkgs.lsof
    pkgs.postgresql
  ];
}
