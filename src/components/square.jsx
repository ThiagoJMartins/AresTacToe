import PropTypes from "prop-types";

export const Square = ({
  children,
  isSelected,
  updateBoard,
  index,
  disabled = false,
}) => {
  const className = `square ${isSelected ? "is-selected" : ""} ${
    disabled ? "is-disabled" : ""
  }`;

  const handleClick = () => {
    if (disabled || typeof updateBoard !== "function") return;
    updateBoard(index);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !disabled) {
          event.preventDefault();
          handleClick();
        }
      }}
      className={className}
    >
      {children}
    </div>
  );
};

Square.propTypes = {
  children: PropTypes.node,
  isSelected: PropTypes.bool,
  updateBoard: PropTypes.func,
  index: PropTypes.number,
  disabled: PropTypes.bool,
};
