typeset -g REMIO_SHELL_INTEGRATION_DIR="${${(%):-%N}:A:h}"

if [[ -n "${REMIO_ZSH_ZDOTDIR-}" ]]; then
  export ZDOTDIR="${REMIO_ZSH_ZDOTDIR}"
else
  unset ZDOTDIR
fi

if [[ -n "${ZDOTDIR-}" ]]; then
  if [[ -f "${ZDOTDIR}/.zshenv" ]]; then
    source "${ZDOTDIR}/.zshenv"
  fi
elif [[ -f "${HOME}/.zshenv" ]]; then
  source "${HOME}/.zshenv"
fi

source "${REMIO_SHELL_INTEGRATION_DIR}/remio-integration.zsh"
