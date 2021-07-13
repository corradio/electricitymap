import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { isEmpty, noop } from 'lodash';

const Wrapper = styled.div`
  position: relative;
`;

const Button = styled.button`
  background-color: #FFFFFF;
  background-image: url(${props => {
    if(props.active) {
      if(props.errorMessage) {
        return resolvePath(`images/${props.icon}_active_error.svg`)
      }
      return resolvePath(`images/${props.icon}_active.svg`)
    } else  {
      return resolvePath(`images/${props.icon}.svg`)
    }
  }});
`;

const ButtonToggle = ({
  active,
  icon,
  onChange,
  tooltip,
  errorMessage = null,
}) => {
  const isMobile = useSelector(state => state.application.isMobile);

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const showTooltip = () => { setTooltipVisible(true); };
  const hideTooltip = () => { setTooltipVisible(false); };

  return (
    <Wrapper>
      <Button
        type="button"
        className="layer-button"
        onFocus={isMobile ? noop : showTooltip}
        onMouseOver={isMobile ? noop : showTooltip}
        onMouseOut={isMobile ? noop : hideTooltip}
        onBlur={isMobile ? noop : hideTooltip}
        onClick={onChange}
        active={active}
        icon={icon}
        errorMessage={errorMessage}
      />
      {tooltipVisible && !isEmpty(tooltip) && (
        <div className="layer-button-tooltip">
          <div className="tooltip-container">
            <div className="tooltip-text">
              <div>{tooltip}</div>
              { active && errorMessage && (
                <div className='tooltip-error'>{errorMessage}</div>
              )}
            </div>
            <div className="arrow" />
          </div>
        </div>
      )}
    </Wrapper>
  );
};

export default ButtonToggle;
