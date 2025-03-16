{pkgs}: {
  deps = [
    pkgs.procps
    pkgs.nodePackages.prettier
    pkgs.lsof
    pkgs.postgresql
  ];
}
