{pkgs}: {
  deps = [
    pkgs.nodePackages.prettier
    pkgs.lsof
    pkgs.postgresql
  ];
}
