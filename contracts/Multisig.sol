// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Multisig {
    address[] public signers;
    uint256 public threshold;
    mapping(address => bool) public isSigner;
    uint256 public proposalCount;

    struct Proposal {
        address destination;
        uint256 value;
        bytes data;
        uint256 approvalCount;
        bool executed;
        bool cancelled;
        address proposer;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address to, uint256 value);
    event ProposalApproved(uint256 indexed proposalId, address indexed approver);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    event ProposalCancelled(uint256 indexed proposalId);

    modifier onlySigner() {
        require(isSigner[msg.sender], "No eres signer");
        _;
    }

    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length > 0, "Debe haber al menos un signer");
        require(_threshold > 0, "Threshold debe ser mayor a 0");
        require(_threshold <= _signers.length, "Threshold no puede superar cantidad de signers");

        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "Signer no puede ser address(0)");
            require(!isSigner[signer], "Signer duplicado");

            isSigner[signer] = true;
            signers.push(signer);
        }

        threshold = _threshold;
    }

    function propose(address _to, uint256 _value, bytes calldata _data)
        external
        onlySigner
        returns (uint256 proposalId)
    {
        proposalId = proposalCount;
        proposals[proposalId] = Proposal({
            destination: _to,
            value: _value,
            data: _data,
            approvalCount: 0,
            executed: false,
            cancelled: false,
            proposer: msg.sender
        });
        proposalCount++;

        emit ProposalCreated(proposalId, msg.sender, _to, _value);
    }

    function approve(uint256 _proposalId) external onlySigner {
        Proposal storage proposal = proposals[_proposalId];

        require(_proposalId < proposalCount, "Propuesta no existe");
        require(!proposal.executed, "Propuesta ya ejecutada");
        require(!proposal.cancelled, "Propuesta cancelada");
        require(!hasApproved[_proposalId][msg.sender], "Ya aprobaste esta propuesta");

        hasApproved[_proposalId][msg.sender] = true;
        proposal.approvalCount++;

        emit ProposalApproved(_proposalId, msg.sender);
    }

    function execute(uint256 _proposalId) external onlySigner {
        Proposal storage proposal = proposals[_proposalId];

        require(_proposalId < proposalCount, "Propuesta no existe");
        require(!proposal.executed, "Propuesta ya ejecutada");
        require(!proposal.cancelled, "Propuesta cancelada");
        require(proposal.approvalCount >= threshold, "No hay suficientes aprobaciones");

        proposal.executed = true;

        (bool success, ) = proposal.destination.call{value: proposal.value}(proposal.data);
        require(success, "La transaccion fallo");

        emit ProposalExecuted(_proposalId, msg.sender);
    }

    function cancel(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];

        require(_proposalId < proposalCount, "Propuesta no existe");
        require(msg.sender == proposal.proposer, "Solo el proponente puede cancelar");
        require(!proposal.executed, "Propuesta ya ejecutada");
        require(!proposal.cancelled, "Propuesta ya cancelada");

        proposal.cancelled = true;

        emit ProposalCancelled(_proposalId);
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    function getProposal(uint256 _proposalId)
        external
        view
        returns (
            address destination,
            uint256 value,
            bytes memory data,
            uint256 approvalCount,
            bool executed,
            bool cancelled,
            address proposer
        )
    {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.destination,
            proposal.value,
            proposal.data,
            proposal.approvalCount,
            proposal.executed,
            proposal.cancelled,
            proposal.proposer
        );
    }

    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }

    receive() external payable {}
}