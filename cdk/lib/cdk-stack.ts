import { Stack, StackProps, CfnOutput, CfnResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

const path = require('path');

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    // cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
    });

    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role that the api task definitions use to run the api code',
    });

    // task definition
    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDefinition', {
      compatibility: ecs.Compatibility.FARGATE,
      cpu: '256',
      memoryMiB: '512',
      networkMode: ecs.NetworkMode.AWS_VPC,
      // ephemeralStorageGiB: 40,
      taskRole,
      runtimePlatform: {
        // TODO This for M1 MAC. Remove this when build image as arm64v8
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // The docker container including the image to use
    const container = taskDefinition.addContainer('socketio', {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../app/')),
      memoryReservationMiB: 512,
      environment: {},
      portMappings: [
        {
          containerPort: 3000,
        },
      ],
    });

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'ApiEcsService',
      {
        cluster,
        protocol: elbv2.ApplicationProtocol.HTTP,
        listenerPort: 80,
        redirectHTTP: false,
        assignPublicIp: true,
        publicLoadBalancer: true,
        taskDefinition,
      }
    );

    // lambda
    const lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
      environment: {
        WEB_SOCKET_URL: `http://${service.loadBalancer.loadBalancerDnsName}`,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Set up the Lambda Function URL
    const cfnFuncUrl = new CfnResource(this, 'LambdaFunctionUrl', {
      type: 'AWS::Lambda::Url',
      properties: {
        TargetFunctionArn: lambdaFunction.functionArn,
        AuthType: 'NONE',
        Cors: { AllowOrigins: ['*'] },
      },
    });
    // Give everyone permission to invoke the Function URL
    new CfnResource(this, 'LambdaFunctionUrlPermission', {
      type: 'AWS::Lambda::Permission',
      properties: {
        FunctionName: lambdaFunction.functionName,
        Principal: '*',
        Action: 'lambda:InvokeFunctionUrl',
        FunctionUrlAuthType: 'NONE',
      },
    });

    // get web socket url
    new CfnOutput(this, 'WebSocketURL', {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`,
    });

    // Get the Function URL as output
    new CfnOutput(this, 'FunctionURL', {
      value: `${cfnFuncUrl.getAtt('FunctionUrl').toString()}`,
    });
  }
}
