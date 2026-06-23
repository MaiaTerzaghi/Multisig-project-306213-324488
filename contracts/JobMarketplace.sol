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

    function createJob(
        string calldata _description,
        uint256 _budget,
        address _evaluator,
        address _provider,
        uint256 _expiresAt
    ) external returns (uint256 jobId) {
        if (_evaluator == address(0)) revert InvalidAddress();
        if (_budget == 0) revert InvalidBudget();
        if (_expiresAt <= block.timestamp) revert InvalidExpiry();

        jobId = jobCount;
        jobs[jobId] = Job({
            client: msg.sender,
            provider: _provider,
            evaluator: _evaluator,
            description: _description,
            budget: _budget,
            expiresAt: _expiresAt,
            status: Status.Open,
            deliverableRef: bytes32(0)
        });
        jobCount++;

        emit JobCreated(jobId, msg.sender, _provider, _evaluator, _budget, _expiresAt);
    }

    function setProvider(uint256 _jobId, address _provider) external {
        Job storage job = jobs[_jobId];
        if (msg.sender != job.client) revert Unauthorized();
        if (job.status != Status.Open) revert WrongStatus();
        if (job.provider != address(0)) revert ProviderAlreadySet();
        if (_provider == address(0)) revert InvalidAddress();

        job.provider = _provider;
        emit ProviderSet(_jobId, _provider);
    }

    function fund(uint256 _jobId) external nonReentrant {
        Job storage job = jobs[_jobId];
        if (msg.sender != job.client) revert Unauthorized();
        if (job.status != Status.Open) revert WrongStatus();
        if (job.provider == address(0)) revert ProviderNotSet();

        job.status = Status.Funded;
        paymentToken.safeTransferFrom(msg.sender, address(this), job.budget);

        emit JobFunded(_jobId, msg.sender, job.budget);
    }
}
