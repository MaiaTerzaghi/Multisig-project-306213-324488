// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract JobMarketplace is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable paymentToken;

    enum Status { Open, Funded, Submitted, Completed, Rejected, Expired }

    struct Job {
        address client;
        address provider;
        address evaluator;
        string description;
        uint256 budget;
        uint256 expiresAt;
        Status status;
        bytes32 deliverableRef;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public jobCount;

    event JobCreated(uint256 indexed jobId, address indexed client, address provider, address evaluator, uint256 budget, uint256 expiresAt);
    event ProviderSet(uint256 indexed jobId, address indexed provider);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverableRef);
    event JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason);
    event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason);
    event JobExpired(uint256 indexed jobId);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);

    error Unauthorized();
    error InvalidAddress();
    error InvalidBudget();
    error InvalidExpiry();
    error WrongStatus();
    error ProviderAlreadySet();
    error ProviderNotSet();
    error NotExpired();

    constructor(address _paymentToken) {
        if (_paymentToken == address(0)) revert InvalidAddress();
        paymentToken = IERC20(_paymentToken);
    }
}
