// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import "./interfaces/IsCLAM.sol";
import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";
import "./libraries/Address.sol";
import "./types/ERC20.sol";

contract OtterPearlERC20 is ERC20 {
    using SafeERC20 for ERC20;
    using Address for address;
    using SafeMath for uint;

    address public immutable sCLAM;

    constructor( address _sCLAM ) ERC20( 'Wrapped sCLAM', 'PEARL', 18 ) {
        require( _sCLAM != address(0) );
        sCLAM = _sCLAM;
    }

    /**
        @notice wrap sCLAM
        @param _amount uint
        @return uint
     */
    function wrap( uint _amount ) external returns ( uint ) {
        IERC20( sCLAM ).transferFrom( msg.sender, address(this), _amount );

        uint value = sCLAMToPEARL( _amount );
        _mint( msg.sender, value );
        return value;
    }

    /**
        @notice unwrap sCLAM
        @param _amount uint
        @return uint
     */
    function unwrap( uint _amount ) external returns ( uint ) {
        _burn( msg.sender, _amount );

        uint value = pearlTosCLAM( _amount );
        IERC20( sCLAM ).transfer( msg.sender, value );
        return value;
    }

    /**
        @notice converts PEARL amount to sCLAM
        @param _amount uint
        @return uint
     */
    function pearlTosCLAM( uint _amount ) public view returns ( uint ) {
        return _amount.mul( IsCLAM( sCLAM ).index() ).div( 10 ** decimals() );
    }

    /**
        @notice converts sCLAM amount to PEARL
        @param _amount uint
        @return uint
     */
    function sCLAMToPEARL( uint _amount ) public view returns ( uint ) {
        return _amount.mul( 10 ** decimals() ).div( IsCLAM( sCLAM ).index() );
    }

}

