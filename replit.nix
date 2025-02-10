{pkgs}: {
  deps = [
    pkgs.killall
    pkgs.procps
    pkgs.nodePackages.prettier
    pkgs.lsof
    pkgs.postgresql
  ];
}
