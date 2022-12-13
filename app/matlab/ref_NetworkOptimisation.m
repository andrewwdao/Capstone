clear all

%% import data
tic

DN_table = readtable('db/DN.csv');
Demands_table = readtable('db/Demands.csv');
FP_table = readtable('db/FP.csv');
PS_table = readtable('db/PS.csv');
link_table = readtable('db/links.csv');

DN_table = [DN_table, Demands_table];

time_importdata = toc;

%% data pre processing
tic

Demands = Demands_table.Demands;   % convert it to a vector

link_fromSS = table();
for i = 1: height(FP_table)
    link_fromSS = [link_fromSS; table({'SS'}, {FP_table.FP{i,1}}, [0], [Inf], 'VariableNames', {'node1', 'node2', 'cost', 'capacity'})];
end
link_table = [link_fromSS; link_table];

link_cost = link_table.cost;
link_capacity = link_table.capacity;

time_preprocessing = toc;

%% params
cost_link = 1e-3;   % virtual cost for a link
cost_flow = 1e-13;  % virtual cost for a flow
cost_PS = 1;   % cost of a potential site 
cost_FP = 2;   % cost of a fibre pole
M = sum(Demands);    % sum of all demands
num_demands = length(Demands);    % number of demand nodes
num_SS = 0;
for i = 1: height(link_table)
    if (link_table.node1{i, 1}(1) == 'S') || (link_table.node2{i, 1}(1) == 'S')
        num_SS = num_SS + 1;
    end
end

%% objective function f(x) = f' x and integer constraints
tic

f = zeros(height(FP_table) + height(PS_table) + height(link_table)*2, 1); % decision variables for: fibre poles, potential sites, links, flows
intcon = []; % indices of the integer variables
for i = 1: height(FP_table)
    f(i) = cost_FP;
    intcon = [intcon, i];
end
for i = height(FP_table)+1: height(FP_table)+height(PS_table)
    f(i) = cost_PS;
    intcon = [intcon, i];
end
for i = height(FP_table)+height(PS_table)+1: height(FP_table)+height(PS_table)+height(link_table)
    f(i) = cost_link;
    intcon = [intcon, i];
end
% comment the fllowing when flows are not considered
for i = height(FP_table)+height(PS_table)+height(link_table)+1: height(FP_table) + height(PS_table) + height(link_table)*2
    f(i) = cost_flow;
end

time_objectivefunction_integerconstraints = toc;

%% lower and upper bounds lb <= x <= ub
tic

lb = [zeros(height(FP_table)+height(PS_table)+height(link_table), 1); -link_capacity];
ub = [ones(height(FP_table)+height(PS_table)+height(link_table), 1); link_capacity];

time_bounds = toc;

%% equality constraints Aeq x = beq
tic

beq = [M; zeros(height(FP_table)+height(PS_table), 1); -Demands; ones(num_demands,1); num_demands]; % constraints for 1)flows, 2)links and 3)number of nodes and links
Aeq = zeros(length(beq), length(f));

% 1) constraints for flows
% super source
for j = height(FP_table)+height(PS_table)+height(link_table)+1: height(FP_table)+height(PS_table)+height(link_table)*2
    flag1 = isequal(link_table.node1{j-(height(FP_table)+height(PS_table)+height(link_table)), 1}, 'SS');
    flag2 = isequal(link_table.node2{j-(height(FP_table)+height(PS_table)+height(link_table)), 1}, 'SS');
    if flag1 % the link is from this source
        Aeq(1, j) = 1;
    elseif flag2 % the link is to this source
        Aeq(1, j) = -1;
    end
end
% fibre poles
for i = 2: height(FP_table)+1
    for j = height(FP_table)+height(PS_table)+height(link_table)+1: height(FP_table)+height(PS_table)+height(link_table)*2
        %F_ind = num2str(i - 2);
        F_ind = i - 1;
        flag1 = isequal(link_table.node1{j-(height(FP_table)+height(PS_table)+height(link_table)), 1}, FP_table.FP{F_ind, 1});
        flag2 = isequal(link_table.node2{j-(height(FP_table)+height(PS_table)+height(link_table)), 1}, FP_table.FP{F_ind, 1});
        if flag1 % the link is from this fibre pole
            Aeq(i, j) = 1;
        elseif flag2 % the link is to this fibre pole
            Aeq(i, j) = -1;
        end
    end
end
% potential sites
for i = height(FP_table)+2: height(FP_table)+height(PS_table)+1
    for j = height(FP_table)+height(PS_table)+height(link_table)+1: height(FP_table)+height(PS_table)+height(link_table)*2  
        %P_ind = num2str(i - (height(FP_table) + 2));
        P_ind = i - (height(FP_table) + 1);
        flag1 = isequal(link_table.node1{j-(height(FP_table)+height(PS_table)+height(link_table)), 1}, PS_table.PS{P_ind, 1});
        flag2 = isequal(link_table.node2{j-(height(FP_table)+height(PS_table)+height(link_table)), 1}, PS_table.PS{P_ind, 1});
        if flag1 % the link is from this potential site
            Aeq(i, j) = 1;
        elseif flag2 % the link is to this potential site
            Aeq(i, j) = -1;
        end
    end
end
% demand nodes
for i = height(FP_table)+height(PS_table)+2: height(FP_table)+height(PS_table)+length(Demands)+1
    for j = height(FP_table)+height(PS_table)+height(link_table)+1: height(FP_table)+height(PS_table)+height(link_table)*2   
        %D_ind = num2str(i - (height(FP_table) + height(PS_table) + 2));
        D_ind = i - (height(FP_table) + height(PS_table) + 1);
        flag1 = isequal(link_table.node1{j-(height(FP_table)+height(PS_table)+height(link_table)), 1}, DN_table.DN{D_ind, 1});
        flag2 = isequal(link_table.node2{j-(height(FP_table)+height(PS_table)+height(link_table)), 1}, DN_table.DN{D_ind, 1});
        if flag1 % the link is from this demand node
            Aeq(i, j) = 1;
        elseif flag2 % the link is to this demand node
            Aeq(i, j) = -1;
        end
    end
end

% 2) constraints for links
for i = height(FP_table)+height(PS_table)+length(Demands)+2: height(FP_table)+height(PS_table)+length(Demands)*2+1
    for j = height(FP_table)+height(PS_table)+1: height(FP_table)+height(PS_table)+height(link_table)   
        %D_ind = num2str(i-height(FP_table)-height(PS_table)-length(Demands)-2);
        D_ind = i-height(FP_table)-height(PS_table)-length(Demands)-1;
        flag1 = isequal(link_table.node1{j-(height(FP_table)+height(PS_table)), 1}, DN_table.DN{D_ind, 1});
        flag2 = isequal(link_table.node2{j-(height(FP_table)+height(PS_table)), 1}, DN_table.DN{D_ind, 1});
        if flag1 || flag2 % the link is connected to a demand node
            Aeq(i, j) = 1;
        end
    end
end

% 3) constraints for number of nodes and links
Aeq(height(FP_table)+height(PS_table)+length(Demands)*2+2, 1:(height(FP_table)+height(PS_table)+height(link_table)))...
    = [-ones(1, height(FP_table)+height(PS_table)), ones(1, height(link_table))];

time_eqconstraints = toc;

%% Inequality constraints
tic

% 1) a selected non-root and non-leaf node must be connected to more than 2 links
A = zeros(height(FP_table)+height(PS_table), length(f));
A(1:height(FP_table)+height(PS_table), 1:height(FP_table)+height(PS_table)) = 2*eye(height(FP_table)+height(PS_table));
for i = 1: height(FP_table)
    for j = height(FP_table)+height(PS_table)+1: height(FP_table)+height(PS_table)+height(link_table)   % links
        %F_ind = num2str(i-1);
        F_ind = i;
        flag1 = isequal(link_table.node1{j-(height(FP_table)+height(PS_table)), 1}, FP_table.FP{F_ind, 1});
        flag2 = isequal(link_table.node2{j-(height(FP_table)+height(PS_table)), 1}, FP_table.FP{F_ind, 1});
        if flag1 || flag2 % the link is connected to a fibre pole
            A(i, j) = -1;
        end
    end
end
for i = height(FP_table)+1: height(FP_table)+height(PS_table)
    for j = height(FP_table)+height(PS_table)+1: height(FP_table)+height(PS_table)+height(link_table)   % links
        %P_ind = num2str(i-height(FP_table)-1);
        P_ind = i - height(FP_table);
        flag1 = isequal(link_table.node1{j-(height(FP_table)+height(PS_table)), 1}, PS_table.PS{P_ind, 1});
        flag2 = isequal(link_table.node2{j-(height(FP_table)+height(PS_table)), 1}, PS_table.PS{P_ind, 1});
        if flag1 || flag2 % the link is connected to a potential site
            A(i, j) = -1;
        end
    end
end

% 2) the two nodes a selected link connected to must be selected
for i = 1: height(link_table)
    if (link_table.node1{i, 1}(1) == 'S') || (link_table.node1{i, 1}(1) == 'D') % the first end is the SS or a DN
        temp = zeros(1, length(f));
        temp(height(FP_table)+height(PS_table)+i) = 1;  % link
        if (link_table.node2{i, 1}(1) == 'F')  % the second end is an FP
            ind = find(strcmp(link_table.node2{i, 1}, FP_table.FP)); % get the index of this second end in FP_table, which is the index of the corresponding decision variable
            %ind = str2double(link_table.node2{i, 1}(2:end)) + 1;
        elseif (link_table.node2{i, 1}(1) == 'P')  % the second end is a PS
            ind = find(strcmp(link_table.node2{i, 1}, PS_table.PS)) + height(FP_table); % get the index of this second end in PS_table. By adding height(FP_table) we get the index of the corresponding decision variable
            %ind = str2double(link_table.node2{i, 1}(2:end)) + height(FP_table) + 1;
        end
        temp(ind) = -1; % node
        A = [A; temp];
    elseif (link_table.node2{i, 1}(1) == 'S') || (link_table.node2{i, 1}(1) == 'D') % the second end is the SS or a DN
        temp = zeros(1, length(f));
        temp(height(FP_table)+height(PS_table)+i) = 1;  % link
        if (link_table.node1{i, 1}(1) == 'F')  % the first end is an FP
            ind = find(strcmp(link_table.node1{i, 1}, FP_table.FP)); % get the index of this first end in FP_table, which is the index of the corresponding decision variable
            %ind = str2double(link_table.node1{i, 1}(2:end)) + 1;
        elseif (link_table.node1{i, 1}(1) == 'P')  % the first end is a PS
            ind = find(strcmp(link_table.node1{i, 1}, PS_table.PS)) + height(FP_table); % get the index of this first end in PS_table. By adding height(FP_table) we get the index of the corresponding decision variable
            %ind = str2double(link_table.node1{i, 1}(2:end)) + height(FP_table) + 1;
        end
        temp(ind) = -1; % node   
        A = [A; temp];
    else  % neither of the two ends is SS or DN
        temp = zeros(1, length(f));
        temp(height(FP_table)+height(PS_table)+i) = 1;  % link
        if (link_table.node1{i, 1}(1) == 'F')  % the first end is an FP
            ind = find(strcmp(link_table.node1{i, 1}, FP_table.FP)); % get the index of this first end in FP_table, which is the index of the corresponding decision variable
            %ind = str2double(link_table.node1{i, 1}(2:end)) + 1;
        elseif (link_table.node1{i, 1}(1) == 'P')  % the first end is a PS
            ind = find(strcmp(link_table.node1{i, 1}, PS_table.PS)) + height(FP_table); % get the index of this first end in PS_table. By adding height(FP_table) we get the index of the corresponding decision variable
            %ind = str2double(link_table.node1{i, 1}(2:end)) + height(FP_table) + 1;
        end
        temp(ind) = -1; % node
        A = [A; temp];
        
        temp = zeros(1, length(f));
        temp(height(FP_table)+height(PS_table)+i) = 1;  % link
        if (link_table.node2{i, 1}(1) == 'F')  % the second end is an FP
            ind = find(strcmp(link_table.node2{i, 1}, FP_table.FP)); % get the index of this second end in FP_table, which is the index of the corresponding decision variable
            %ind = str2double(link_table.node2{i, 1}(2:end)) + 1;
        elseif (link_table.node2{i, 1}(1) == 'P')  % the second end is a PS
            ind = find(strcmp(link_table.node2{i, 1}, PS_table.PS)) + height(FP_table); % get the index of this first end in PS_table. By adding height(FP_table) we get the index of the corresponding decision variable
            %ind = str2double(link_table.node2{i, 1}(2:end)) + height(FP_table) + 1;
        end
        temp(ind) = -1; % node
        A = [A; temp];
    end
end

% 3) the absolute value of a flow is bounded by M times the corresponding link variable
temp = [zeros(height(link_table), height(FP_table)+height(PS_table)), -M*eye(height(link_table))];
temp = [temp, eye(height(link_table))];
A = [A; temp];
temp = [zeros(height(link_table), height(FP_table)+height(PS_table)), -M*eye(height(link_table))];
temp = [temp, -eye(height(link_table))];
A = [A; temp];

b = zeros(length(A(:,1)), 1);

time_ineqconstraints = toc;

%% optimisation
tic
%options = optimoptions('intlinprog','IntegerPreprocess','basic','LPPreprocess','basic','MaxTime',36000);
%x = intlinprog(f,intcon,A,b,Aeq,beq,lb,ub, options)
x = intlinprog(f,intcon,A,b,Aeq,beq,lb,ub)
time_op = toc;

time_processing = time_ineqconstraints + time_eqconstraints + time_objectivefunction_integerconstraints + time_bounds + time_preprocessing;

%% export data
% the output is a table of selected links
x_mask = round(x);
selected_link = table();
for i = 1: height(link_table)
    if x_mask(i+height(FP_table)+height(PS_table)) == 1
        selected_link = [selected_link; table({link_table.node1{i,1}}, {link_table.node2{i,1}})];
    end
end
writetable(selected_link, 'selected_link.csv');
%[link_fromSS; table({'SS'}, {['F' F_ind]}, [0], [Inf], 'VariableNames', {'node1', 'node2', 'cost', 'capacity'})]