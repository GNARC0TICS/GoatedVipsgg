{pkgs}: {
  deps = [
    pkgs.mailman
    pkgs.jq
    pkgs.procps
    pkgs.nodePackages.prettier
    pkgs.lsof
    pkgs.postgresql
  ];
}
